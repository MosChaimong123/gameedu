"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { io as ClientIO, type Socket } from "socket.io-client"

type SocketContextType = {
    socket: Socket | null
    isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
})

export const useSocket = () => {
    return useContext(SocketContext)
}

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket] = useState<Socket | null>(() => {
        if (typeof window === "undefined") return null

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined
        return ClientIO(socketUrl, {
            path: "/socket.io",
            addTrailingSlash: false,
        })
    })
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        if (!socket) return

        socket.on("connect", () => {
            setIsConnected(true)
        })

        socket.on("disconnect", () => {
            setIsConnected(false)
        })

        return () => {
            socket.disconnect()
        }
    }, [socket])

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    )
}
