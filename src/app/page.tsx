import ReviewWorkspace from "./review-workspace";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  return <ReviewWorkspace />;
}
