import './index.css'
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import MainPage from "./ui/pages/MainPage"
import { CssBaseline } from '@mui/material';

const App = () => <StrictMode>
    <CssBaseline />
    <MainPage />
</StrictMode>

ReactDOM.createRoot(document.getElementById("root")!)
    .render(<App />)