import { useEffect, useMemo, useState } from 'react';
import { loadPhotoBlob } from '../storage/photoDb';
import { Exercise, Protocol } from '../types';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

type WorkoutRunnerProps = {
  protocol: Protocol;
  exercises: Exercise[];
  onClose: () => void;
  onComplete: () => void;
};

export const WorkoutRunner = ({ protocol, exercises, onClose, onComplete }: WorkoutRunnerProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const step = protocol.steps[stepIndex];
  const exercise = useMemo(
    () => exercises.find(item => item.id === step.exerciseRef),
    [exercises, step.exerciseRef]
  );

  useEffect(() => {
    if (!step?.durationSec) {
      setRemainingSec(0);
      return;
    }
    setRemainingSec(step.durationSec);
  }, [step]);

  useEffect(() => {
    if (!running || !step?.durationSec) return;
    if (remainingSec <= 0) return;
    const id = window.setInterval(() => {
      setRemainingSec(prev => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, remainingSec, step?.durationSec]);

  useEffect(() => {
    let active = true;
    const loadVideo = async () => {
      if (!exercise?.media?.localVideoBlobKey) {
        setVideoUrl(null);
        return;
      }
      const blob = await loadPhotoBlob(exercise.media.localVideoBlobKey);
      if (!blob || !active) return;
      setVideoUrl(URL.createObjectURL(blob));
    };
    loadVideo();
    return () => {
      active = false;
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [exercise?.media?.localVideoBlobKey, videoUrl]);

  const nextStep = () => {
    if (stepIndex < protocol.steps.length - 1) {
      setStepIndex(prev => prev + 1);
      setRunning(false);
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setStepIndex(prev => prev - 1);
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Шаг {stepIndex + 1}</p>
          <h3 className="text-lg font-semibold">{step.text}</h3>
          {exercise ? <p className="text-sm text-slate-500">{exercise.name}</p> : null}
        </div>
        <button className="btn-secondary" onClick={onClose}>
          Закрыть
        </button>
      </div>

      {step.durationSec ? (
        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-center text-2xl font-semibold text-white">
          {formatTime(remainingSec)}
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
          Таймер не нужен
        </div>
      )}

      {exercise?.media?.youtubeUrl ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <iframe
            className="h-48 w-full"
            src={exercise.media.youtubeUrl.replace('watch?v=', 'embed/')}
            title="Видео упражнения"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {videoUrl ? (
        <video className="w-full rounded-2xl" controls src={videoUrl} />
      ) : null}

      {exercise ? (
        <div className="space-y-3 text-sm text-slate-600">
          {exercise.steps.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Шаги</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {exercise.steps.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {exercise.cues.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Подсказки</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {exercise.cues.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {exercise.mistakes.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Ошибки</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {exercise.mistakes.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-secondary" onClick={prevStep} disabled={stepIndex === 0}>
          Назад
        </button>
        <button
          className="btn-secondary"
          onClick={nextStep}
          disabled={stepIndex === protocol.steps.length - 1}
        >
          Далее
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-primary" onClick={() => setRunning(prev => !prev)}>
          {running ? 'Пауза' : 'Старт'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            onComplete();
            onClose();
          }}
        >
          Завершить
        </button>
      </div>
    </div>
  );
};
