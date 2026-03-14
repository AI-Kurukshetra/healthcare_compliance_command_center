"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel: string;
};

export function SubmitButton({
  children,
  className,
  disabled,
  pendingLabel,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-70`}
      disabled={disabled || pending}
      aria-disabled={disabled || pending}
      aria-busy={pending}
      {...props}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        ) : null}
        <span>{pending ? pendingLabel : children}</span>
      </span>
    </button>
  );
}
