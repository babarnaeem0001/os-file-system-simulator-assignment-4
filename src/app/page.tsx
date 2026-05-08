import FileSystemDashboard from "@/components/FileSystemDashboard";
import { createInitialState } from "@/lib/filesystem";

export default function Home() {
  return <FileSystemDashboard initialState={createInitialState()} />;
}
