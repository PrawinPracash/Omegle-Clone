import { useNavigate } from "react-router-dom";
import "./index.css";
function Home() {
  const navigate = useNavigate();
  function handleBtn() {
    navigate("/room");
  }
  return (
    <div>
      <h1 className="home-header">Welcome to Omegle </h1>
      <button onClick={handleBtn}> Meet People </button>
    </div>
  );
}
export default Home;
