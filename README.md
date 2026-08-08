# 🟢 Greenlight Investment Simulator

An AI-driven product evaluation terminal that analyzes video game pitches against historical Steam market data to determine commercial viability. 

## 🚀 Live Demo
**[[Insert your Vercel URL here](https://steam-investment-simulator.vercel.app/)]**

## 📋 Overview
Greenlight acts as an automated AI Product Manager for game publishers. It takes a natural-language game pitch, extracts core mechanics and genres, and cross-references them against a backend dataset of Steam market association rules to output a data-backed investment verdict.

## ✨ Key Features
* **Market-Grounded AI Analysis:** Utilizes the Google Gemini API strictly bound to custom association rules and lift multipliers to prevent AI hallucination.
* **Prescriptive Strategy:** Generates specific "Strategic Pivots" to improve a pitch's commercial viability based on missing high-value synergies.
* **High-End Neo-Brutalist UI:** A responsive, dark-mode terminal interface featuring real-time data tickers and Framer Motion animations.

## 🛠️ Tech Stack
* **Frontend:** Next.js, React, Tailwind CSS, Framer Motion
* **Backend:** Next.js API Routes, Google GenAI SDK
* **Data Modeling:** Python, Jupyter Notebook (Apriori Algorithm for Market Basket Analysis)

## 📊 Data Methodology
The AI's logic is driven by a `rules.json` file generated from a massive dataset of Steam games. By calculating the "lift" between different genres and mechanics, the model knows which feature combinations historically result in high market success, and which are historically poor investments.

## ⚙️ Running Locally
To run this project on your own machine for grading or testing:

1. Clone this repository to your local machine.
2. Open your terminal and run `npm install` to install all dependencies.
3. Create a new file in the root folder named exactly `.env.local`.
4. Inside that file, add your Gemini API key like this: `GEMINI_API_KEY=your_key_here`
5. Run the development server using `npm run dev`.
6. Open your browser and navigate to `http://localhost:3000`.
