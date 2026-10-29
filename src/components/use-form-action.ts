'use client';

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from 'react';

type State = { error?: string; ok?: string } | null | undefined;

// Like useActionState, but keeps what the user typed when the action returns
// an error (React's <form action> resets every field after each submit).
export function useFormAction(
  action: (state: State, form: FormData) => Promise<State>,
  { resetOnSuccess = false } = {},
) {
  const [state, dispatch, pending] = useActionState<State, FormData>(action, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(() => dispatch(form));
  }

  return { state, pending, formProps: { ref, onSubmit } };
}
