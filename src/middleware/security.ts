import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { config } from '../config';
import { morganMiddleware, requestLogger } from './logging';

import { RequestHandler } from 'express';

export const securityMiddleware: RequestHandler[] = [
  // Security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: [
          "'self'",
          ...(config.nodeEnv === 'development' 
            ? ["http://localhost:8000", "https://localhost:8000"] 
            : [
                "https://your-frontend-domain.com",
                "https://your-api-domain.com"
              ]
          )
        ],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),

  // CORS configuration
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (config.cors.origin.includes('*')) {
        return callback(null, true);
      }

      if (config.cors.origin.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-render-auth', 'X-Render-Auth'],
  }),

  // Rate limiting
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Compression
  compression(),

  // Body parsing
  express.json({ limit: '10mb' }),
  express.urlencoded({ extended: true, limit: '10mb' }),

  // HTTP request logging
  morganMiddleware,
  requestLogger,
]; 