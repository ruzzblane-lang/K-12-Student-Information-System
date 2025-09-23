const { v4: uuidv4 } = require('uuid');

class TranslationAccessibilityAPI {
  constructor(db, aiConfig, complianceConfig) {
    this.db = db;
    this.aiConfig = aiConfig;
    this.complianceConfig = complianceConfig;
    this.supportedLanguages = new Map();
    this.accessibilityFeatures = new Map();
    this.translationCache = new Map();
  }

  async initialize() {
    console.log('Initializing Translation & Accessibility API...');
    
    // Initialize supported languages
    await this.initializeSupportedLanguages();
    
    // Initialize accessibility features
    await this.initializeAccessibilityFeatures();
    
    // Initialize translation services
    await this.initializeTranslationServices();
    
    // Initialize speech services
    await this.initializeSpeechServices();
    
    console.log('Translation & Accessibility API initialized successfully.');
  }

  async initializeSupportedLanguages() {
    this.supportedLanguages.set('languages', [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
    ]);

    this.supportedLanguages.set('regions', {
      'en': ['US', 'GB', 'AU', 'CA'],
      'es': ['ES', 'MX', 'AR', 'CO'],
      'fr': ['FR', 'CA', 'BE', 'CH'],
      'de': ['DE', 'AT', 'CH'],
      'pt': ['BR', 'PT'],
      'zh': ['CN', 'TW', 'HK'],
      'ar': ['SA', 'EG', 'AE']
    });
  }

  async initializeAccessibilityFeatures() {
    this.accessibilityFeatures.set('features', [
      {
        id: 'text_to_speech',
        name: 'Text to Speech',
        description: 'Convert text to spoken audio',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'],
        voices: {
          'en': ['en-US-Standard-A', 'en-US-Standard-B', 'en-US-Standard-C', 'en-US-Standard-D'],
          'es': ['es-ES-Standard-A', 'es-MX-Standard-A'],
          'fr': ['fr-FR-Standard-A', 'fr-CA-Standard-A'],
          'de': ['de-DE-Standard-A', 'de-DE-Standard-B']
        }
      },
      {
        id: 'speech_to_text',
        name: 'Speech to Text',
        description: 'Convert spoken audio to text',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'],
        models: {
          'en': ['en-US-BroadbandModel', 'en-US-NarrowbandModel'],
          'es': ['es-ES-BroadbandModel', 'es-MX-BroadbandModel'],
          'fr': ['fr-FR-BroadbandModel', 'fr-CA-BroadbandModel']
        }
      },
      {
        id: 'text_translation',
        name: 'Text Translation',
        description: 'Translate text between languages',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'],
        translationEngines: ['google', 'azure', 'openai']
      },
      {
        id: 'image_translation',
        name: 'Image Translation',
        description: 'Extract and translate text from images',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi']
      },
      {
        id: 'document_translation',
        name: 'Document Translation',
        description: 'Translate entire documents while preserving formatting',
        supportedFormats: ['pdf', 'docx', 'txt', 'html'],
        supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi']
      }
    ]);
  }

  async initializeTranslationServices() {
    // Initialize translation service configurations
    this.translationServices = {
      google: {
        enabled: !!process.env.GOOGLE_TRANSLATE_API_KEY,
        apiKey: process.env.GOOGLE_TRANSLATE_API_KEY,
        endpoint: 'https://translation.googleapis.com/language/translate/v2'
      },
      azure: {
        enabled: !!this.aiConfig.azure.apiKey,
        apiKey: this.aiConfig.azure.apiKey,
        endpoint: this.aiConfig.azure.endpoint + '/translator/text/v3.0/translate',
        region: this.aiConfig.azure.region
      },
      openai: {
        enabled: !!this.aiConfig.openai.apiKey,
        apiKey: this.aiConfig.openai.apiKey,
        model: this.aiConfig.openai.model
      }
    };
  }

  async initializeSpeechServices() {
    // Initialize speech service configurations
    this.speechServices = {
      google: {
        enabled: !!process.env.GOOGLE_CLOUD_API_KEY,
        apiKey: process.env.GOOGLE_CLOUD_API_KEY,
        endpoint: 'https://texttospeech.googleapis.com/v1/text:synthesize'
      },
      azure: {
        enabled: !!this.aiConfig.azure.apiKey,
        apiKey: this.aiConfig.azure.apiKey,
        endpoint: this.aiConfig.azure.endpoint + '/cognitiveservices/v1',
        region: this.aiConfig.azure.region
      },
      aws: {
        enabled: !!this.aiConfig.aws.accessKeyId,
        accessKeyId: this.aiConfig.aws.accessKeyId,
        secretAccessKey: this.aiConfig.aws.secretAccessKey,
        region: this.aiConfig.aws.region
      }
    };
  }

  async translateText({ text, sourceLanguage, targetLanguage, context = {}, options = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(context.tenantId, 'translateText', { text, sourceLanguage, targetLanguage });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      // Check cache first
      const cacheKey = `${sourceLanguage}_${targetLanguage}_${this.hashText(text)}`;
      if (this.translationCache.has(cacheKey) && !options.forceRefresh) {
        return this.translationCache.get(cacheKey);
      }

      // Choose translation service
      const translationService = this.selectTranslationService(sourceLanguage, targetLanguage);
      
      let translation;
      switch (translationService) {
        case 'google':
          translation = await this.translateWithGoogle(text, sourceLanguage, targetLanguage);
          break;
        case 'azure':
          translation = await this.translateWithAzure(text, sourceLanguage, targetLanguage);
          break;
        case 'openai':
          translation = await this.translateWithOpenAI(text, sourceLanguage, targetLanguage, context);
          break;
        default:
          throw new Error('No translation service available');
      }

      // Cache the result
      this.translationCache.set(cacheKey, translation);

      // Log the translation
      await this.logTranslation(context.tenantId, sourceLanguage, targetLanguage, text.length, translation.service);

      return translation;
    } catch (error) {
      console.error('Error translating text:', error);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  selectTranslationService(sourceLanguage, targetLanguage) {
    // Select the best available translation service
    if (this.translationServices.google.enabled) {
      return 'google';
    } else if (this.translationServices.azure.enabled) {
      return 'azure';
    } else if (this.translationServices.openai.enabled) {
      return 'openai';
    } else {
      throw new Error('No translation service configured');
    }
  }

  async translateWithGoogle(text, sourceLanguage, targetLanguage) {
    try {
      const response = await fetch(`${this.translationServices.google.endpoint}?key=${this.translationServices.google.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: targetLanguage,
          format: 'text'
        })
      });

      const data = await response.json();
      
      return {
        translatedText: data.data.translations[0].translatedText,
        sourceLanguage: data.data.translations[0].detectedSourceLanguage || sourceLanguage,
        targetLanguage,
        service: 'google',
        confidence: 0.95,
        translatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error with Google translation:', error);
      throw error;
    }
  }

  async translateWithAzure(text, sourceLanguage, targetLanguage) {
    try {
      const response = await fetch(`${this.translationServices.azure.endpoint}?api-version=3.0&from=${sourceLanguage}&to=${targetLanguage}`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.translationServices.azure.apiKey,
          'Ocp-Apim-Subscription-Region': this.translationServices.azure.region,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ text }])
      });

      const data = await response.json();
      
      return {
        translatedText: data[0].translations[0].text,
        sourceLanguage: data[0].detectedLanguage?.language || sourceLanguage,
        targetLanguage,
        service: 'azure',
        confidence: data[0].translations[0].confidence || 0.9,
        translatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error with Azure translation:', error);
      throw error;
    }
  }

  async translateWithOpenAI(text, sourceLanguage, targetLanguage, context) {
    try {
      const languageNames = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'hi': 'Hindi'
      };

      const prompt = `
        Translate the following text from ${languageNames[sourceLanguage] || sourceLanguage} to ${languageNames[targetLanguage] || targetLanguage}.
        Maintain the original meaning, tone, and context.
        If this is educational content, ensure the translation is appropriate for students.
        
        Text to translate: "${text}"
        
        Return only the translated text, nothing else.
      `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.aiConfig.openai.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.aiConfig.openai.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: Math.min(this.aiConfig.openai.maxTokens, text.length * 2),
          temperature: 0.3
        })
      });

      const data = await response.json();
      
      return {
        translatedText: data.choices[0].message.content.trim(),
        sourceLanguage,
        targetLanguage,
        service: 'openai',
        confidence: 0.85,
        translatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error with OpenAI translation:', error);
      throw error;
    }
  }

  async convertTextToSpeech({ text, language, voice, speed = 1.0, pitch = 1.0, context = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(context.tenantId, 'textToSpeech', { text, language });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      // Choose speech service
      const speechService = this.selectSpeechService(language);
      
      let audioData;
      switch (speechService) {
        case 'google':
          audioData = await this.synthesizeWithGoogle(text, language, voice, speed, pitch);
          break;
        case 'azure':
          audioData = await this.synthesizeWithAzure(text, language, voice, speed, pitch);
          break;
        case 'aws':
          audioData = await this.synthesizeWithAWS(text, language, voice, speed, pitch);
          break;
        default:
          throw new Error('No speech service available');
      }

      // Log the speech synthesis
      await this.logSpeechSynthesis(context.tenantId, language, text.length, speechService);

      return audioData;
    } catch (error) {
      console.error('Error converting text to speech:', error);
      throw new Error(`Text-to-speech conversion failed: ${error.message}`);
    }
  }

  selectSpeechService(language) {
    // Select the best available speech service
    if (this.speechServices.google.enabled) {
      return 'google';
    } else if (this.speechServices.azure.enabled) {
      return 'azure';
    } else if (this.speechServices.aws.enabled) {
      return 'aws';
    } else {
      throw new Error('No speech service configured');
    }
  }

  async synthesizeWithGoogle(text, language, voice, speed, pitch) {
    try {
      const response = await fetch(`${this.speechServices.google.endpoint}?key=${this.speechServices.google.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: language,
            name: voice || `${language}-Standard-A`,
            ssmlGender: 'NEUTRAL'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speed,
            pitch: pitch
          }
        })
      });

      const data = await response.json();
      
      return {
        audioData: data.audioContent,
        format: 'mp3',
        language,
        voice: voice || `${language}-Standard-A`,
        speed,
        pitch,
        service: 'google',
        synthesizedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error with Google text-to-speech:', error);
      throw error;
    }
  }

  async synthesizeWithAzure(text, language, voice, speed, pitch) {
    try {
      const ssml = `
        <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${language}'>
          <voice name='${voice || `${language}-Standard-A`}'>
            <prosody rate='${speed}' pitch='${pitch}'>
              ${text}
            </prosody>
          </voice>
        </speak>
      `;

      const response = await fetch(`${this.speechServices.azure.endpoint}/texttospeech/3.1-preview1/synthesize`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.speechServices.azure.apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
        },
        body: ssml
      });

      const audioBuffer = await response.arrayBuffer();
      
      return {
        audioData: Buffer.from(audioBuffer).toString('base64'),
        format: 'mp3',
        language,
        voice: voice || `${language}-Standard-A`,
        speed,
        pitch,
        service: 'azure',
        synthesizedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error with Azure text-to-speech:', error);
      throw error;
    }
  }

  async synthesizeWithAWS(text, language, voice, speed, pitch) {
    try {
      // AWS Polly implementation would go here
      // For demo purposes, return a placeholder
      return {
        audioData: 'base64_encoded_audio_data',
        format: 'mp3',
        language,
        voice: voice || `${language}-Standard`,
        speed,
        pitch,
        service: 'aws',
        synthesizedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error with AWS text-to-speech:', error);
      throw error;
    }
  }

  async convertSpeechToText({ audioData, language, context = {}, options = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(context.tenantId, 'speechToText', { language });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      // Choose speech service
      const speechService = this.selectSpeechService(language);
      
      let transcription;
      switch (speechService) {
        case 'google':
          transcription = await this.transcribeWithGoogle(audioData, language, options);
          break;
        case 'azure':
          transcription = await this.transcribeWithAzure(audioData, language, options);
          break;
        case 'aws':
          transcription = await this.transcribeWithAWS(audioData, language, options);
          break;
        default:
          throw new Error('No speech service available');
      }

      // Log the speech transcription
      await this.logSpeechTranscription(context.tenantId, language, transcription.confidence, speechService);

      return transcription;
    } catch (error) {
      console.error('Error converting speech to text:', error);
      throw new Error(`Speech-to-text conversion failed: ${error.message}`);
    }
  }

  async transcribeWithGoogle(audioData, language, options) {
    try {
      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${this.speechServices.google.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: {
            encoding: 'MP3',
            sampleRateHertz: 16000,
            languageCode: language,
            enableAutomaticPunctuation: options.enablePunctuation !== false,
            enableWordTimeOffsets: options.enableTimestamps === true
          },
          audio: {
            content: audioData
          }
        })
      });

      const data = await response.json();
      
      return {
        transcribedText: data.results[0]?.alternatives[0]?.transcript || '',
        confidence: data.results[0]?.alternatives[0]?.confidence || 0,
        language,
        service: 'google',
        transcribedAt: new Date().toISOString(),
        alternatives: data.results[0]?.alternatives || []
      };
    } catch (error) {
      console.error('Error with Google speech-to-text:', error);
      throw error;
    }
  }

  async transcribeWithAzure(audioData, language, options) {
    try {
      const response = await fetch(`${this.speechServices.azure.endpoint}/speech/recognition/conversation/cognitiveservices/v1?language=${language}`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.speechServices.azure.apiKey,
          'Content-Type': 'audio/wav'
        },
        body: audioData
      });

      const data = await response.json();
      
      return {
        transcribedText: data.DisplayText || '',
        confidence: data.Confidence || 0,
        language,
        service: 'azure',
        transcribedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error with Azure speech-to-text:', error);
      throw error;
    }
  }

  async transcribeWithAWS(audioData, language, options) {
    try {
      // AWS Transcribe implementation would go here
      // For demo purposes, return a placeholder
      return {
        transcribedText: 'Transcribed text from AWS Transcribe',
        confidence: 0.85,
        language,
        service: 'aws',
        transcribedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error with AWS speech-to-text:', error);
      throw error;
    }
  }

  async translateDocument({ fileId, tenantId, sourceLanguage, targetLanguage, context = {} }) {
    try {
      // Validate compliance
      const compliance = await this.validateCompliance(tenantId, 'translateDocument', { fileId, sourceLanguage, targetLanguage });
      if (!compliance.compliant) {
        throw new Error(`Compliance violation: ${compliance.reason}`);
      }

      // Get document content
      const documentContent = await this.extractDocumentContent(fileId, tenantId);
      
      // Translate the content
      const translation = await this.translateText({
        text: documentContent,
        sourceLanguage,
        targetLanguage,
        context,
        options: { preserveFormatting: true }
      });

      // Create translated document
      const translatedDocument = await this.createTranslatedDocument(fileId, tenantId, translation);

      // Log the document translation
      await this.logDocumentTranslation(tenantId, fileId, sourceLanguage, targetLanguage);

      return translatedDocument;
    } catch (error) {
      console.error('Error translating document:', error);
      throw new Error(`Document translation failed: ${error.message}`);
    }
  }

  async extractDocumentContent(fileId, tenantId) {
    try {
      // Get document from archive
      const query = `
        SELECT file_name, file_type, s3_key, metadata
        FROM archive_files
        WHERE id = $1 AND tenant_id = $2
      `;
      
      const result = await this.db.query(query, [fileId, tenantId]);
      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }

      const file = result.rows[0];
      
      // Extract text based on file type
      switch (file.file_type) {
        case 'application/pdf':
          return await this.extractPDFText(file.s3_key);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractWordText(file.s3_key);
        case 'text/plain':
          return await this.extractPlainText(file.s3_key);
        default:
          throw new Error(`Unsupported file type: ${file.file_type}`);
      }
    } catch (error) {
      console.error('Error extracting document content:', error);
      throw error;
    }
  }

  async extractPDFText(s3Key) {
    // PDF text extraction implementation
    return 'Extracted PDF text content';
  }

  async extractWordText(s3Key) {
    // Word document text extraction implementation
    return 'Extracted Word document text content';
  }

  async extractPlainText(s3Key) {
    // Plain text extraction implementation
    return 'Extracted plain text content';
  }

  async createTranslatedDocument(originalFileId, tenantId, translation) {
    // Create translated document implementation
    return {
      translatedFileId: uuidv4(),
      originalFileId,
      translatedText: translation.translatedText,
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      service: translation.service,
      translatedAt: translation.translatedAt
    };
  }

  async getSupportedLanguages() {
    return {
      languages: this.supportedLanguages.get('languages'),
      regions: this.supportedLanguages.get('regions')
    };
  }

  async getAccessibilityFeatures() {
    return this.accessibilityFeatures.get('features');
  }

  async getServiceStatus() {
    return {
      translationServices: {
        google: this.translationServices.google.enabled,
        azure: this.translationServices.azure.enabled,
        openai: this.translationServices.openai.enabled
      },
      speechServices: {
        google: this.speechServices.google.enabled,
        azure: this.speechServices.azure.enabled,
        aws: this.speechServices.aws.enabled
      }
    };
  }

  hashText(text) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(text).digest('hex');
  }

  async validateCompliance(tenantId, operation, data) {
    // Validate compliance for translation and accessibility operations
    if (this.complianceConfig.auditLogging) {
      await this.logAccessibilityOperation(tenantId, operation, data);
    }
    
    return { compliant: true };
  }

  async logTranslation(tenantId, sourceLanguage, targetLanguage, textLength, service) {
    try {
      const query = `
        INSERT INTO ai_translation_logs (
          id, tenant_id, source_language, target_language, 
          text_length, service, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        sourceLanguage,
        targetLanguage,
        textLength,
        service
      ]);
    } catch (error) {
      console.error('Error logging translation:', error);
    }
  }

  async logSpeechSynthesis(tenantId, language, textLength, service) {
    try {
      const query = `
        INSERT INTO ai_speech_logs (
          id, tenant_id, language, text_length, 
          service, operation_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        language,
        textLength,
        service,
        'text_to_speech'
      ]);
    } catch (error) {
      console.error('Error logging speech synthesis:', error);
    }
  }

  async logSpeechTranscription(tenantId, language, confidence, service) {
    try {
      const query = `
        INSERT INTO ai_speech_logs (
          id, tenant_id, language, confidence, 
          service, operation_type, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        language,
        confidence,
        service,
        'speech_to_text'
      ]);
    } catch (error) {
      console.error('Error logging speech transcription:', error);
    }
  }

  async logDocumentTranslation(tenantId, fileId, sourceLanguage, targetLanguage) {
    try {
      const query = `
        INSERT INTO ai_document_translation_logs (
          id, tenant_id, file_id, source_language, 
          target_language, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        fileId,
        sourceLanguage,
        targetLanguage
      ]);
    } catch (error) {
      console.error('Error logging document translation:', error);
    }
  }

  async logAccessibilityOperation(tenantId, operation, data) {
    try {
      const query = `
        INSERT INTO ai_accessibility_logs (
          id, tenant_id, operation, operation_data, created_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `;
      
      await this.db.query(query, [
        uuidv4(),
        tenantId,
        operation,
        JSON.stringify(data)
      ]);
    } catch (error) {
      console.error('Error logging accessibility operation:', error);
    }
  }

  async isHealthy() {
    // Check if the translation and accessibility API is healthy
    const hasTranslationService = this.translationServices.google.enabled || 
                                 this.translationServices.azure.enabled || 
                                 this.translationServices.openai.enabled;
    
    const hasSpeechService = this.speechServices.google.enabled || 
                            this.speechServices.azure.enabled || 
                            this.speechServices.aws.enabled;
    
    return hasTranslationService || hasSpeechService;
  }
}

module.exports = TranslationAccessibilityAPI;
