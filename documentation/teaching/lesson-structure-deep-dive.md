# Lesson Structure: A Deep Dive

This document provides a detailed look into the structure and pedagogical purpose of the three core HTML artifacts that form a complete lesson unit.

## 1. The Comprehensive Lesson (`lezione_[argomento].html`)

-   **Purpose:** This is the central teaching document. It's designed for a guided learning session where the Teacher explains the topic to the Student. It must be exhaustive, clear, and rich with examples.
-   **Key Features:**
    -   **Card-Based Structure:** The content is broken down into logical, self-contained "cards" or sections. This modularity helps in focusing on one concept at a time.
    -   **In-Depth Explanations:** Each card delves deep into a specific aspect of the topic.
    -   **Targeted Examples:** Examples are crucial. They should illustrate the concepts clearly and, where possible, be tailored to the student's context.
    -   **Error Analysis:** A key component is the analysis of common errors, particularly those the student is known to make. This section should be highlighted to draw attention.

## 2. The Note Deck (`appunti_[argomento].html`)

-   **Purpose:** This artifact serves as a bridge between passive learning (reading the lesson) and active recall (using Anki). It's a condensed, "atomic" version of the main lesson, optimized for the student to manually create their own Anki cards.
-   **Key Features:**
    -   **Front/Back Format:** Each item is presented in a clear "Front" (prompt, question) and "Back" (answer, explanation) format, mirroring an Anki card.
    -   **Conciseness:** Information is distilled to its essential core. The goal is to create memorable, bite-sized chunks of knowledge.
    -   **Visual Clarity:** The layout is clean and minimalist to avoid cognitive overload and make the content easy to parse and transfer to Anki.
    -   **Generation Effect:** The student is expected to *manually* create the Anki cards from this document. This act of "generation" is a powerful learning technique that enhances memory retention.

## 3. The Interactive Exercises (`esercizi_[argomento].html`)

-   **Purpose:** This is a one-time, interactive web application for practice and assessment. It allows the student to test their understanding in a controlled environment immediately after the lesson.
-   **Key Features:**
    -   **Three-Phase Structure:** The exercises are divided into three phases, mirroring a structured learning progression:
        1.  **Phase 1: Comprehension (True/False):** Tests basic understanding of the concepts.
        2.  **Phase 2: Recognition (Multiple Choice):** Challenges the student to identify correct applications of the rules.
        3.  **Phase 3: Production (Fill-in-the-blank/Rewrite):** Requires active production of the language, the most challenging phase.
    -   **Interactivity:** Provides immediate feedback.
    -   **State Management:** Includes features to save, load, and reset progress, allowing the student to work at their own pace and the teacher to review their work.
    -   **Scaffolding for Anki:** The exercises in this app serve as a "warm-up" for the more rigorous, long-term practice with the pre-made Anki decks.
