// Compatibility shim for useActionState (React Canary API)
// Maps to useFormState from react-dom, which is supported by Next.js 14

import { useFormState } from "react-dom";

export function useActionState<State, Payload = FormData>(
  action: (state: State, payload: Payload) => State | Promise<State>,
  initialState: State,
) {
  return useFormState<State, Payload>(action, initialState);
}
