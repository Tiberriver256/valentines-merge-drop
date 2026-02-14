import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import Game from "./pages/Game";

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Game />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
