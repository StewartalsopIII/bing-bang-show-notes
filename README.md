# Bing Bang Show Notes Generator

A web application for generating professional podcast show notes from transcript files using Google's Gemini AI. The application takes a podcast transcript as input and generates comprehensive show notes with key insights, timestamps, and contact information.

## Features

- Upload transcript files (.txt, .vtt, .srt, .md) or paste transcript text directly
- Generate structured show notes with:
  - Introduction that mentions the host (Stewart Alsop) and topic
  - Timestamps for significant moments in the podcast
  - Seven key insights from the conversation
  - Contact information for guests mentioned in the podcast
- Download generated show notes in Markdown or plain text format
- Responsive design that works on mobile and desktop
- Containerized deployment with Docker

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **AI**: Google Gemini API
- **File Handling**: react-dropzone
- **Containerization**: Docker

## Prerequisites

- Node.js 18+ and npm
- Google Gemini API key (for AI-powered show notes generation)
- Docker and Docker Compose (for containerized deployment)

## Installation and Setup

### Local Development

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/bing-bang-show-notes.git
   cd bing-bang-show-notes
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Gemini API key
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local and add your Gemini API key
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Docker Deployment on Ubuntu

1. Install Docker and Docker Compose on Ubuntu 24.10:

   ```bash
   # Update package manager
   sudo apt update
   
   # Install Docker dependencies
   sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
   
   # Add Docker's official GPG key
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
   
   # Add Docker repository
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   
   # Update package database with Docker packages
   sudo apt update
   
   # Install Docker
   sudo apt install -y docker-ce docker-ce-cli containerd.io
   
   # Install Docker Compose
   sudo apt install -y docker-compose-plugin
   
   # Add your user to the docker group (to run docker without sudo)
   sudo usermod -aG docker ${USER}
   
   # Apply new group membership (or log out and back in)
   newgrp docker
   ```

2. Clone the repository and navigate to the project directory
   ```bash
   git clone https://github.com/yourusername/bing-bang-show-notes.git
   cd bing-bang-show-notes
   ```

3. Create a `.env` file with your Gemini API key
   ```bash
   cp .env.local.example .env
   # Edit .env and add your Gemini API key
   ```

4. Build and run the Docker container
   ```bash
   docker-compose up -d
   ```

5. Access the application at http://your-server-ip:3000

## Usage

1. Access the application in your web browser
2. Paste your podcast transcript in the text area or upload a transcript file
3. Click "Generate Show Notes" to process the transcript
4. View the generated show notes and select the format (Markdown or plain text)
5. Click "Download" to save the show notes to your computer

## Production Deployment Considerations

- **SSL/TLS**: For secure connections, consider using a reverse proxy like Nginx with Let's Encrypt
- **Persistent Storage**: If you need to store transcripts or generated notes, add volume mapping to the Docker configuration
- **Environment Variables**: Use secure methods to manage the Gemini API key in production
- **Scaling**: The application can be deployed behind a load balancer for higher traffic scenarios
