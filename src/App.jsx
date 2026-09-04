import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./pages/Layout";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  );
}

export default App;
