import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { RecipeProvider } from './context/RecipeContext'
import Home from './pages/Home'
import Recipes from './pages/Recipes'

export default function App() {
  return (
    <RecipeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/recipes/:ingredientId" element={<Recipes />} />
        </Routes>
      </BrowserRouter>
    </RecipeProvider>
  )
}
