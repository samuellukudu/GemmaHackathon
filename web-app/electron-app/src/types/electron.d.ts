declare global {
  interface Window {
    electronAPI: {
      getTopics: () => Promise<any[]>;
      getTopicDetails: (topicId: string) => Promise<any>;
      searchTopics: (searchTerm: string) => Promise<any[]>;
      getLessons: (topicId: string) => Promise<any[]>;
      getFlashcards: (lessonId: number) => Promise<any[]>;
      getQuizzes: (flashcardSetId: number) => Promise<any[]>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      openFile: () => Promise<any>;
      saveFile: (data: any) => Promise<any>;
      platform: string;
      isDev: boolean;
    };
  }
}

export {}; 