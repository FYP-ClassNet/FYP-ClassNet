# FYP-ClassNet 🎓

A local network–powered classroom platform that connects teachers and students for learning, even without internet access.

## 🧠 Project Overview

FYP-ClassNet is an offline classroom collaboration system designed to bridge the digital divide in educational institutions where internet connectivity might be limited. It enables seamless interaction between teachers and students through a local area network (LAN), requiring no internet connection.

## 🎯 Vision

To revolutionize classroom dynamics by providing a web-based system that:

- Works entirely offline using local area networks
- Enables real-time collaboration between teachers and students
- Eliminates the need for constant internet connectivity
- Makes digital learning accessible in resource-constrained environments

## ⚙️ Core Concept

- Teacher's laptop acts as a local server
- Students connect via the same LAN (router or hotspot)
- Browser-based interface (no installation needed)
- All communication happens within the local network

## 🔑 Key Features

### 👩‍🏫 For Teachers

#### Class Server Management

- Create and host a class server instantly
- Generate unique session codes
- Monitor connected students in real-time
- IP-based local access (e.g., <http://192.168.0.10:5000>)

#### Screen Sharing

- Real-time screen streaming via WebRTC
- Local network-only transmission
- Low-latency sharing

#### Attendance System

- Automatic IP-based attendance tracking
- Real-time connection monitoring
- Anti-proxy measures through unique IP tracking

#### Content Distribution

- Share educational materials instantly
- Support for PDFs, notes, videos, presentations
- Local file transfer system

#### Interactive Whiteboard

- Real-time collaborative drawing
- Multi-color support
- Save and share board contents

### 👨‍🎓 For Students

#### Easy Access

- Simple LAN connection process
- Code/IP-based class joining
- No account creation required

#### Learning Tools

- Live screen view
- Access to shared resources
- Interactive whiteboard view
- Question raising system

## 🔒 Technical Stack

- **Backend:** Node.js/Go
- **Frontend:** React/Next.js
- **Networking:** WebRTC, Socket.io
- **Storage:** Local file system
- **Protocol:** TCP/UDP over LAN

## 💡 Advantages

1. **Zero Internet Dependency**
   - Works in areas with no/poor internet
   - Reliable local network communication

2. **Cost-Effective**
   - No need for projectors
   - Works on existing devices
   - No cloud service costs

3. **Inclusive Learning**
   - Perfect for rural schools
   - Ideal for resource-constrained institutions
   - Works in disaster-prone areas

4. **Low Requirements**
   - Runs on basic laptops
   - Mobile device compatible
   - Minimal setup needed

## 🌟 Future Roadmap

- [ ] Hybrid mode (offline + online sync)
- [ ] Local chat system
- [ ] Quiz module
- [ ] Teacher analytics dashboard
- [ ] Plug-and-play router solution
- [ ] Mobile app development
- [ ] Enhanced security features

## 🛠️ Getting Started

Coming soon...

## 📝 License

Coming soon...

## 👥 Contributors

Coming soon...

---

*FYP-ClassNet - Empowering Education, No Internet Required* 📚✨
