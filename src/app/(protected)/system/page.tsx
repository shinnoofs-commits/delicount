import SystemClient from "./client";

export const metadata = {
  title: "システム管理 | Deli・COUNT",
  description: "データのバックアップと復元を行います。",
};

export default function SystemPage() {
  return <SystemClient />;
}
