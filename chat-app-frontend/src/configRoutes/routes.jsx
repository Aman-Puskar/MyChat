import React from 'react'
import { Route, Routes } from 'react-router'
import App from '../App'
import ChatPage from '../components/ChatPage'
function MyRoutes() {
  return (
    <Routes>
        <Route path='/' element={<App/>}/>
        <Route path='/chat' element={<ChatPage/>}/>
    </Routes>
  )
}

export default MyRoutes