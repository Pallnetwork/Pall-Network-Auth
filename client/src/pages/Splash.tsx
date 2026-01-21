import logo from "@/assets/logo.png";

export default function Splash() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-900">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl px-8 py-10 flex flex-col items-center shadow-xl">
        <img
          src={logo}
          alt="Pall Network"
          className="w-24 h-24 mb-6"
        />

        <p className="text-white text-lg">Welcome to</p>
        <h1 className="text-white text-2xl font-bold">
          Pall Network
        </h1>
        <p className="text-white/80 text-sm mt-1">
          Digital Network Platform
        </p>

        <div className="mt-6 w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}
