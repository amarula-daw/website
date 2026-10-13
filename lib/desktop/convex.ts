import { fetchMutation, fetchQuery, type NextjsOptions } from "convex/nextjs"
import type {
  ArgsAndOptions,
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from "convex/server"

/*
 * The Convex store for Awma usage, rate limits and entitlement caching,
 * called from the server only. Its functions check CONVEX_SERVER_SECRET,
 * which must match the Convex deployment's environment variable.
 */

type Secured<Type extends "query" | "mutation"> = FunctionReference<
  Type,
  "public",
  { secret: string }
>
type Args<Ref extends FunctionReference<"query" | "mutation">> = Omit<
  FunctionArgs<Ref>,
  "secret"
>

/** The call's arguments with the secret added. */
function withSecret<Ref extends FunctionReference<"query" | "mutation">>(
  args: Args<Ref>
) {
  return [{ ...args, secret: secret() }] as unknown as ArgsAndOptions<
    Ref,
    NextjsOptions
  >
}

function secret() {
  const value = process.env.CONVEX_SERVER_SECRET
  if (!value || !process.env.NEXT_PUBLIC_CONVEX_URL)
    throw new Error(
      "Convex isn't configured (NEXT_PUBLIC_CONVEX_URL and CONVEX_SERVER_SECRET)"
    )
  return value
}

export function convexQuery<Ref extends Secured<"query">>(
  query: Ref,
  args: Args<Ref>
): Promise<FunctionReturnType<Ref>> {
  return fetchQuery(query, ...withSecret<Ref>(args))
}

export function convexMutation<Ref extends Secured<"mutation">>(
  mutation: Ref,
  args: Args<Ref>
): Promise<FunctionReturnType<Ref>> {
  return fetchMutation(mutation, ...withSecret<Ref>(args))
}
