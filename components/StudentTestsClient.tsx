"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Role } from "@/lib/session";
import {
  STUDENT_TEST_GROUPS,
  type StudentTestGroup,
  type StudentTestStudent,
} from "@/lib/studentTests";

type Asset = {
  key: string;
  url: string;
  lastModified: string | null;
};

type StudentRow = StudentTestStudent & {
  sample: Asset | null;
  feedback: Asset | null;
  completed: boolean;
};

type Props = {
  group: StudentTestGroup;
  groupLabel: string;
  initialStudents: StudentTestStudent[];
  role: Role;
};

type UploadKind = "score" | "student-recording" | "teacher-feedback";

const GROUP_ORDER: StudentTestGroup[] = ["kids", "women", "men"];

function dateLabel(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("el-GR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function extensionForMime(mime: string) {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mpeg")) return "mp3";
  return "webm";
}

function preferredAudioMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

async function uploadToSignedUrl(url: string, body: Blob, contentType: string) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
}

function AudioRecorder({
  label,
  disabled,
  mode = "inline",
  score,
  title,
  onRecordingReady,
}: {
  label: string;
  disabled?: boolean;
  mode?: "inline" | "fullscreen";
  score?: Asset | null;
  title?: string;
  onRecordingReady: (blob: Blob, filename: string, mime: string) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopWaveform = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  };

  const startWaveform = (stream: MediaStream) => {
    const canvas = canvasRef.current;
    const AudioContextCtor = window.AudioContext;
    if (!canvas || !AudioContextCtor) return;

    stopWaveform();

    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    audioContextRef.current = audioContext;

    const buffer = new Uint8Array(analyser.fftSize);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      analyser.getByteTimeDomainData(buffer);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(10, 27, 63, 0.04)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#b58a2a";
      ctx.beginPath();

      const sliceWidth = canvas.width / buffer.length;
      let x = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const y = (buffer[i] / 128) * (canvas.height / 2);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.stroke();
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const start = async () => {
    setError(null);
    if (mode === "fullscreen") setFullscreenOpen(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Ο browser δεν υποστηρίζει ηχογράφηση.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = preferredAudioMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        stopWaveform();
        cleanupStream();
        setRecording(false);
        setBusy(true);
        try {
          await onRecordingReady(blob, `recording-${Date.now()}.${extensionForMime(type)}`, type);
        } catch (err: any) {
          setError(err?.message || "Αποτυχία αποθήκευσης ηχογράφησης.");
        } finally {
          setBusy(false);
          if (mode === "fullscreen") setFullscreenOpen(false);
        }
      };

      recorder.start();
      setRecording(true);
      requestAnimationFrame(() => startWaveform(stream));
    } catch (err: any) {
      stopWaveform();
      cleanupStream();
      setError(err?.message || "Δεν επιτράπηκε η χρήση μικροφώνου.");
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
  };

  const closeFullscreen = () => {
    if (recording) {
      stop();
      return;
    }
    setFullscreenOpen(false);
  };

  useEffect(() => {
    return () => {
      stopWaveform();
      cleanupStream();
    };
  }, []);

  const button = (
    <button
      type="button"
      className={recording ? "btn btn-gold btn-sm" : "btn btn-outline btn-sm"}
      onClick={recording ? stop : start}
      disabled={disabled || busy}
    >
      {busy ? "Αποθήκευση..." : recording ? "Τέλος ηχογράφησης" : label}
    </button>
  );

  return (
    <div className="space-y-1">
      {button}
      {recording && mode === "inline" && (
        <div className="flex items-center gap-2 text-[11px] text-muted" aria-live="polite">
          <canvas
            ref={canvasRef}
            width={240}
            height={44}
            className="h-11 w-48 rounded-md border border-subtle bg-white"
            aria-label="Ζωντανή κυματομορφή ηχογράφησης"
          />
          <span>Ηχογραφείται...</span>
        </div>
      )}
      {fullscreenOpen && mode === "fullscreen" && (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-[rgba(10,27,63,0.94)] px-4 py-5 text-white"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/60">Ηχογράφηση μαθητή</div>
                <h2 className="mt-1 font-heading text-2xl">{title || "Δοκιμή φωνής"}</h2>
              </div>
              <button type="button" className="btn btn-outline" onClick={closeFullscreen} disabled={busy}>
                {recording ? "Τέλος" : "Κλείσιμο"}
              </button>
            </div>

            <div className="flex-1 rounded-2xl border border-white/15 bg-white p-3 shadow-2xl">
              {score ? (
                <img
                  src={score.url}
                  alt="Παρτιτούρα αξιολόγησης"
                  className="h-[58vh] w-full rounded-xl object-contain"
                />
              ) : (
                <div className="flex h-[58vh] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center text-slate-500">
                  <div className="font-heading text-2xl text-slate-700">Παρτιτούρα αξιολόγησης</div>
                  <p className="mt-2 max-w-md text-sm">
                    Δεν έχει ανέβει ακόμη εικόνα. Μπορείτε να κάνετε ηχογράφηση τώρα και η παρτιτούρα
                    θα εμφανιστεί εδώ όταν την ανεβάσει ο δάσκαλος.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 pb-4">
              <button
                type="button"
                onClick={recording ? stop : start}
                disabled={busy}
                className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-full border-4 border-[rgba(181,138,42,0.7)] bg-white text-blue shadow-[0_0_50px_rgba(181,138,42,0.45)]"
                aria-label={recording ? "Τέλος ηχογράφησης" : "Έναρξη ηχογράφησης"}
              >
                <span className="absolute inset-4 rounded-full bg-gold/10" />
                <svg
                  viewBox="0 0 24 24"
                  className="absolute top-8 h-10 w-10 text-blue"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <path d="M12 19v3" />
                </svg>
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={120}
                  className="relative z-10 mt-10 h-24 w-44"
                  aria-label="Ζωντανή κυματομορφή ηχογράφησης"
                />
              </button>
              <div className="text-center">
                <div className="font-heading text-xl">
                  {busy ? "Αποθήκευση ηχογράφησης..." : recording ? "Ηχογραφείται..." : "Έτοιμο για ηχογράφηση"}
                </div>
                <div className="text-sm text-white/70">
                  {recording ? "Πατήστε τον κύκλο όταν ολοκληρώσετε." : "Αν ζητηθεί άδεια μικροφώνου, επιλέξτε αποδοχή."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {error && <div className="text-[11px] text-red-700">{error}</div>}
    </div>
  );
}

export default function StudentTestsClient({
  group,
  groupLabel,
  initialStudents,
  role,
}: Props) {
  const isAdmin = role === "admin";
  const [score, setScore] = useState<Asset | null>(null);
  const [students, setStudents] = useState<StudentRow[]>(
    initialStudents.map((student) => ({
      ...student,
      sample: null,
      feedback: null,
      completed: false,
    }))
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/student-tests/${group}`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || "Αποτυχία φόρτωσης δοκιμών.");
    setScore(json.score ?? null);
    setStudents(json.students ?? []);
  }, [group]);

  useEffect(() => {
    refresh().catch((err: any) => setStatus(err?.message || "Αποτυχία φόρτωσης δοκιμών."));
  }, [refresh]);

  const uploadFile = async ({
    kind,
    file,
    studentId,
    busyLabel,
  }: {
    kind: UploadKind;
    file: Blob & { name?: string };
    studentId?: string;
    busyLabel: string;
  }) => {
    setBusyKey(busyLabel);
    setStatus(null);
    try {
      const mime = file.type || "audio/webm";
      const presignRes = await fetch("/api/student-tests/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group,
          kind,
          studentId,
          filename: file.name || `recording-${Date.now()}.${extensionForMime(mime)}`,
          mime,
        }),
      });

      const presignJson = await presignRes.json().catch(() => ({}));
      if (!presignRes.ok) throw new Error(presignJson?.error || "Αποτυχία υπογραφής upload.");

      await uploadToSignedUrl(presignJson.url, file, presignJson.contentType || mime);
      await refresh();
      setStatus("Η αποθήκευση ολοκληρώθηκε.");
    } finally {
      setBusyKey(null);
    }
  };

  const toggleCompleted = async (studentId: string, completed: boolean) => {
    const previous = students;
    setStudents((current) =>
      current.map((student) => (student.id === studentId ? { ...student, completed } : student))
    );
    setStatus(null);

    try {
      const res = await fetch("/api/student-tests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group, studentId, completed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Αποτυχία ενημέρωσης ολοκλήρωσης.");
    } catch (err: any) {
      setStudents(previous);
      setStatus(err?.message || "Αποτυχία ενημέρωσης ολοκλήρωσης.");
    }
  };

  return (
    <div className="space-y-5">
      <nav className="flex flex-wrap gap-2">
        {GROUP_ORDER.map((item) => (
          <Link
            key={item}
            href={`/students/${item}`}
            className={`btn btn-outline btn-sm ${item === group ? "btn--selected" : ""}`}
          >
            {STUDENT_TEST_GROUPS[item].label}
          </Link>
        ))}
      </nav>

      <section className="card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg text-blue">Παρτιτούρα αξιολόγησης</h2>
            <p className="text-sm text-muted">{groupLabel}</p>
          </div>

          {isAdmin && (
            <label className="btn btn-gold btn-sm cursor-pointer">
              {busyKey === "score" ? "Ανέβασμα..." : "Ανέβασμα εικόνας"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busyKey !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) {
                    uploadFile({ kind: "score", file, busyLabel: "score" }).catch((err: any) =>
                      setStatus(err?.message || "Αποτυχία ανεβάσματος εικόνας.")
                    );
                  }
                }}
              />
            </label>
          )}
        </div>

        {score ? (
          <div className="space-y-2">
            <img
              src={score.url}
              alt="Παρτιτούρα αξιολόγησης"
              className="max-h-[520px] w-full rounded-lg border border-subtle object-contain bg-white"
            />
            <div className="text-xs text-muted">Τελευταία ενημέρωση: {dateLabel(score.lastModified)}</div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-subtle p-6 text-sm text-muted">
            Δεν έχει ανέβει ακόμη εικόνα παρτιτούρας για αυτό το τμήμα.
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-subtle bg-[rgba(0,0,0,0.02)] text-left">
                <th className="px-4 py-3 font-semibold">Μαθητής</th>
                <th className="px-4 py-3 font-semibold">Ηχογράφηση μαθητή</th>
                <th className="px-4 py-3 font-semibold">Αξιολόγηση δασκάλου</th>
                <th className="px-4 py-3 font-semibold text-center">Ολοκληρώθηκε</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-subtle align-top last:border-b-0">
                  <td className="px-4 py-4 font-medium">{student.name}</td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      {student.sample ? (
                        <div className="space-y-1">
                          <audio controls src={student.sample.url} className="w-full max-w-xs" />
                          <div className="text-[11px] text-muted">{dateLabel(student.sample.lastModified)}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted">Δεν υπάρχει ηχογράφηση.</div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="btn btn-outline btn-sm cursor-pointer">
                          Ανέβασμα
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            disabled={busyKey !== null}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              if (file) {
                                uploadFile({
                                  kind: "student-recording",
                                  file,
                                  studentId: student.id,
                                  busyLabel: `sample-${student.id}`,
                                }).catch((err: any) =>
                                  setStatus(err?.message || "Αποτυχία ανεβάσματος ηχογράφησης.")
                                );
                              }
                            }}
                          />
                        </label>
                        <AudioRecorder
                          label="Ηχογράφηση"
                          disabled={busyKey !== null}
                          mode="fullscreen"
                          score={score}
                          title={student.name}
                          onRecordingReady={(blob, filename, mime) =>
                            uploadFile({
                              kind: "student-recording",
                              file: Object.assign(blob, { name: filename }),
                              studentId: student.id,
                              busyLabel: `sample-${student.id}`,
                            })
                          }
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      {student.feedback ? (
                        <div className="space-y-1">
                          <audio controls src={student.feedback.url} className="w-full max-w-xs" />
                          <div className="text-[11px] text-muted">{dateLabel(student.feedback.lastModified)}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted">Δεν υπάρχει αξιολόγηση.</div>
                      )}
                      {isAdmin && (
                        <div className="flex flex-wrap items-center gap-2">
                          <AudioRecorder
                            label="Ηχογράφηση"
                            disabled={busyKey !== null}
                            onRecordingReady={(blob, filename, mime) =>
                              uploadFile({
                                kind: "teacher-feedback",
                                file: Object.assign(blob, { name: filename }),
                                studentId: student.id,
                                busyLabel: `feedback-${student.id}`,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={student.completed}
                      disabled={!isAdmin}
                      onChange={(event) => toggleCompleted(student.id, event.target.checked)}
                      aria-label={`Ολοκλήρωση αξιολόγησης για ${student.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {status && <div className="text-sm text-muted">{status}</div>}
    </div>
  );
}
