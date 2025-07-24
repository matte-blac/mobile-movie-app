import { useAuth } from "@/context/AuthContext"
import { Redirect } from "expo-router"
import { useState } from "react"
import { Alert } from "react-native"


const Auth = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const {login, register, isAuthenticated} = useAuth()

    // redirect to tabs if already authenticated
    if (isAuthenticated) {
        return <Redirect href='/(tabs)'/>
    }

    const handleSubmit = async () => {
        if (!email || !password || (!isLogin && !name)) {
            Alert.alert('Error', 'Please fill in all fields')
            return
        }

        setLoading(true)
        try {
            if (isLogin) {
                await login(email, password)
            } else {
                await register(email, password, name)
            }
        } catch (error: any) {
            Alert.alert(
                'Authentication Error',
                error.message || 'Something went wrong. Please try again.'
            )
        } finally {
            setLoading(false)
        }
    }
}

export default Auth