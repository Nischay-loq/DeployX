import { useState } from "react"
import { useParams } from "react-router-dom"

export default function ResetPassword() {
  const { token } = useParams() // token from URL
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage("")

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.")
      return
    }

    try {
      // Simulate API call
      await new Promise((res) => setTimeout(res, 1000))

      if (token === "sampletoken") {
        setMessage("Password successfully reset! You can now log in.")
      } else {
        setMessage("Invalid or expired token.")
      }
    } catch (err) {
      setMessage("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-lg w-96"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">
          Reset Password
        </h2>

        <input
          type="password"
          placeholder="New Password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition"
        >
          Reset Password
        </button>

        {message && (
          <p className="text-center mt-3 text-sm text-gray-700">{message}</p>
        )}
      </form>
    </div>
  )
}
