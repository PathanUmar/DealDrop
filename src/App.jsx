import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./pages/Layout";
import { Toaster } from "./components/ui/sonner";
import Routess from "./api/cron/check-prices/route";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />} />
          <Route path="/api/cron/check-prices" element={<Routess />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;
