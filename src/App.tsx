import Nav from "./components/Nav";
import Hero from "./components/Hero";
import TheIdea from "./components/TheIdea";
import LeaveAnEcho from "./components/LeaveAnEcho";
import StoriesMeet from "./components/StoriesMeet";
import InsideEchoes from "./components/InsideEchoes";
import Privacy from "./components/Privacy";
import WorldOfEchoes from "./components/WorldOfEchoes";
import EnterEchoes from "./components/EnterEchoes";
import Footer from "./components/Footer";
import "./styles/sections.css";

function App() {
  return (
    <div className="page">
      <a className="skip-link" href="#install">
        Skip to download
      </a>
      <Nav />
      <Hero />
      <main>
        <TheIdea />
        <LeaveAnEcho />
        <StoriesMeet />
        <InsideEchoes />
        <Privacy />
        <WorldOfEchoes />
        <EnterEchoes />
      </main>
      <Footer />
    </div>
  );
}

export default App;
