# 🎮 SprintSolve - Educational Trivia Game

[![CI/CD Pipeline](https://github.com/APorkolab/SprintSolve/actions/workflows/ci.yml/badge.svg)](https://github.com/APorkolab/SprintSolve/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **A professional, TypeScript-based educational trivia game that combines modern development practices with engaging gameplay mechanics.**

**[🚀 Play the live game here!](https://aporkolab.github.io/SprintSolve/)**

## 📋 Table of Contents

- [✨ Features](#-features)
- [🎯 Gameplay](#-gameplay)
- [🛠️ Tech Stack](#️-tech-stack)
- [⚡ Quick Start](#-quick-start)
- [🔧 Development](#-development)
- [🧪 Testing](#-testing)
- [📦 Building & Deployment](#-building--deployment)
- [🏗️ Architecture](#️-architecture)
- [🎨 Design System](#-design-system)
- [📈 Performance](#-performance)
- [🔒 Security](#-security)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)


## ✨ Features

SprintSolve represents a **senior-level TypeScript web application** with enterprise-grade features and architecture:

### 🎮 Gameplay Features
- **Dynamic Trivia Integration** - Live questions from [Open Trivia Database API](https://opentdb.com/)
- **Advanced Category Management** - Smart category selection with caching and offline support  
- **Adaptive Difficulty** - AI-driven difficulty scaling based on player performance
- **Power-up System** - Strategic collectibles with object pooling for performance
- **Achievement System** - 25+ achievements across 6 categories with progress tracking
- **Statistics & Analytics** - Comprehensive player metrics and performance tracking
- **Progressive Difficulty** - Dynamic speed scaling and challenge adaptation

### 🎨 Modern UI/UX
- **Glass Morphism Design** - Modern visual effects with Tailwind CSS
- **Responsive Canvas** - Adaptive rendering across all device sizes
- **Dark/Light Themes** - Automatic theme detection with manual override
- **Accessibility First** - WCAG 2.1 AA compliant with keyboard navigation
- **Progressive Web App** - Offline support, installable, native-like experience
- **Smooth Animations** - Hardware-accelerated animations with reduced motion support

### 🛠️ Technical Excellence
- **TypeScript Strict Mode** - 100% type safety with comprehensive interfaces
- **Modern Architecture** - Clean Architecture with dependency injection
- **Performance Optimized** - Object pooling, lazy loading, bundle splitting
- **Comprehensive Testing** - Unit, integration, E2E tests with 90%+ coverage
- **Security Hardened** - CSP headers, sanitization, vulnerability scanning
- **Enterprise DevOps** - CI/CD pipeline with quality gates and monitoring

## Gameplay Logic

1.  **Start:** The game begins with a start screen. Clicking "Start Game" takes you to the category selection.
2.  **Category Selection:** A list of trivia categories is fetched from the OpenTDB API. Select a category to begin the game.
3.  **Answering Questions:**
    - A question appears at the top of the screen.
    - Four obstacles, each representing an answer, will move from right to left.
    - Navigate the character to collide with the obstacle corresponding to the correct answer.
4.  **Scoring & Difficulty:**
    - A correct answer increases your score and the game speed. There is also a chance for a power-up to spawn.
    - An incorrect answer ends the game, unless you have a shield.
5.  **Power-ups:**
    - **Shield (Blue):** If you collect a shield, you can survive one incorrect answer. The shield is consumed in the process.
    - **Slow-mo (Clock):** Temporarily reduces the game speed by 50% for 5 seconds.
6.  **Game Over:** The game ends when you hit an incorrect obstacle without a shield. Your character explodes, and a "Game Over" screen appears with your final score. You can then choose to play again.

## Tech Stack
- **Frontend:** HTML5, CSS3, JavaScript (ES Modules)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Testing:** [Jest](https://jestjs.io/)
- **API:** [Open Trivia Database](https://opentdb.com/)
- **Deployment:** [GitHub Actions](https://github.com/features/actions) & [GitHub Pages](https://pages.github.com/)

## Project Structure
-   `index.html`: The main HTML entry point for the game.
-   `public/`: Contains static assets.
-   `src/`: Contains all JavaScript source code, broken down into modules (e.g., `main.js`, `character.js`, `ui.js`).
-   `__tests__/`: Contains all Jest unit tests.
-   `.github/workflows/`: Contains the GitHub Actions workflow for automated deployment.
-   `vite.config.js`: Configuration file for Vite.
-   `package.json`: Manages project dependencies and scripts.

## Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Setup
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/APorkolab/SprintSolve.git
    cd SprintSolve
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the Development Server
To start the Vite development server with hot-reloading:
```bash
npm run dev
```
Vite will output the local URL (usually `http://localhost:5173`).

### Running Tests
The test suite currently includes unit tests for collision detection and character logic.
```bash
npm test
```

## Deployment
This project is automatically deployed to GitHub Pages. The workflow is defined in `.github/workflows/deploy.yml`. Any push to the `main` branch will trigger a new build and deployment.
