import { useContext } from "react"
import { AppContext } from "./AppContext"
import Home from "./components/Home"
import Setting from "./components/Setting"

function App() {
  const { currPage } = useContext(AppContext)
  return (
    <div className="w-[500px] min-h-[300px] p-5">
      {
        currPage === 'main' &&
        <Home />
      }
      {
        currPage === 'setting' && 
        <Setting />
      }
    </div>
  )
}

export default App
