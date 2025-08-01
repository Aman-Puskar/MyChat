import React from 'react'
import { Route, Routes } from 'react-router'
import App from '../App'
import ChatPage from '../components/ChatPage'
import Layouts from '../BackGroundLayouts/Layouts'
function MyRoutes() {
  return (
    <Layouts>
    <Routes>
        <Route path='/' element={<App/>}/>
        <Route path='/chat' element={<ChatPage/>}/>
    </Routes>
    </Layouts>
  )
}

export default MyRoutes