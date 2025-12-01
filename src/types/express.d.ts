// Type declarations for Express Request to include user info
// Using module augmentation to extend Express Request interface
import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        isDegraded?: boolean;
      };
    }
  }
}

export {};
