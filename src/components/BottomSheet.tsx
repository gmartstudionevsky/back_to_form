import { ReactNode } from 'react';

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export const BottomSheet = ({ open, title, onClose, children }: BottomSheetProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div className="relative flex max-h-[85vh] flex-col rounded-t-3xl bg-white p-5 shadow-xl safe-bottom">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="btn-secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto pb-6 pr-1">{children}</div>
      </div>
    </div>
  );
};
