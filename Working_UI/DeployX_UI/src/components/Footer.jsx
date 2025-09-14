import { Github, Linkedin, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="py-10 border-t border-softWhite/10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-softWhite/70">© {new Date().getFullYear()} DeployX • Created by Team DeployX</div>
        <div className="flex gap-4">
          {[Twitter, Github, Linkedin].map((Icon, i)=>(
            <a key={i} href="#" className="p-2 rounded-xl hover:shadow-glow border-trace glass">
              <Icon size={18} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
