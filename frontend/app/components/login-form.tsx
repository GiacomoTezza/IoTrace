"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useSubmit, useActionData, useNavigation } from "react-router";
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"

type FormDataShape = {
  email: string;
  password: string;
};

const schema = yup.object({
  email: yup.string().required("Email is required").email("Email is not valid"),
  password: yup.string().required("Password is required"),
}).required();

export function LoginForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
}) {
  const submit = useSubmit();
  const actionData = useActionData() as { success?: boolean; message?: string } | undefined;
  const nav = useNavigation();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormDataShape>({
    mode: "onTouched",
    resolver: yupResolver(schema),
  });

  const onSubmit = (data: FormDataShape) => {
    // Create FormData to send to the route action
    const fd = new FormData();
    fd.set("email", data.email);
    fd.set("password", data.password);

    // submit to the current route; React Router will call the route action
    submit(fd, { method: "post" });
  };

  const submitting = nav.state !== "idle";

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-muted-foreground text-balance">
                  Login to your IoTrace account
                </p>
              </div>

              {actionData?.message ? (
                <div className="text-red-600 text-sm">{actionData?.message}</div>
              ) : null}

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  aria-invalid={Boolean(errors?.email)}
                  required
                />
                {errors?.email?.message ? <p className="text-red-600 text-sm">{errors.email.message}</p> : null}
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  {...register("password")}
                  id="password"
                  type="password"
                  aria-invalid={Boolean(errors?.password)}
                  required
                />
                {errors?.password?.message ? <p className="text-red-600 text-sm">{errors.password.message}</p> : null}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Login"}
              </Button>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <img
              src="/login-image.jpg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
