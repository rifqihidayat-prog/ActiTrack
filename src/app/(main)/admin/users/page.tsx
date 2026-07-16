import { getUsers } from "@/lib/actions";
import UserManager from "./user-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers();
  return <UserManager users={users} />;
}
