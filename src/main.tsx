import './index.css'
import '@fontsource/roboto/latin-400.css'
import './ui/i18n/i18n'

import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import MainPage from "./ui/pages/MainPage"
import { CssBaseline } from '@mui/material'

const App = () => (
  <StrictMode>
    <CssBaseline />
    <MainPage />
  </StrictMode>
)

ReactDOM.createRoot(document.getElementById("root")!)
  .render(<App />)
