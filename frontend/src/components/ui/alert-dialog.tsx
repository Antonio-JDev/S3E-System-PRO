import * as React from "react"

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface AlertDialogContentProps {
  children: React.ReactNode
  className?: string
}

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export const AlertDialog: React.FC<AlertDialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-[101]">{children}</div>
    </div>
  );
};

export const AlertDialogContent: React.FC<AlertDialogContentProps> = ({ children, className = "" }) => {
  return (
    <div className={`bg-white dark:bg-dark-card dark:border dark:border-dark-border rounded-lg shadow-xl p-6 max-w-md w-full mx-4 ${className}`}>
      {children}
    </div>
  );
};

type DialogChildProps = { children: React.ReactNode; className?: string };

export const AlertDialogHeader: React.FC<DialogChildProps> = ({ children, className = '' }) => {
  return <div className={`mb-4 ${className}`}>{children}</div>;
};

export const AlertDialogTitle: React.FC<DialogChildProps> = ({ children, className = '' }) => {
  return <h2 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h2>;
};

export const AlertDialogDescription: React.FC<DialogChildProps> = ({ children, className = '' }) => {
  return <p className={`text-sm text-gray-600 dark:text-gray-400 mt-2 ${className}`}>{children}</p>;
};

export const AlertDialogFooter: React.FC<DialogChildProps> = ({ children, className = '' }) => {
  return <div className={`mt-6 flex justify-end gap-3 ${className}`}>{children}</div>;
};

export const AlertDialogCancel: React.FC<AlertDialogActionProps> = ({ children, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
    >
      {children}
    </button>
  );
};

export const AlertDialogAction: React.FC<AlertDialogActionProps & { className?: string }> = ({ children, onClick, className = "", ...props }) => {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
