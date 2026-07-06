"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type AuthActionState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionState = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create your student account</CardTitle>
        <CardDescription>
          Sign up to enroll in subjects and submit assignments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" required autoComplete="given-name" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" required autoComplete="family-name" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input id="nickname" name="nickname" placeholder="e.g. Ben" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="studentNumber">Student ID</Label>
            <Input id="studentNumber" name="studentNumber" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="groupName">Group name</Label>
            <Input
              id="groupName"
              name="groupName"
              placeholder="e.g. Group 4"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
