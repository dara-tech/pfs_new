import { t } from '../translations';

// Map sections to their questions
const SECTION_QUESTIONS = {
  consent: [
    {
      name: 'consent',
      key: 'acknowledge',
      type: 'radio',
      options: [
        { value: '1', key: 'q1a_3' }, // Yes - Satisfied
        { value: '0', key: 'q1a_1' }, // No - Unsatisfied
      ],
    },
  ],
  section1a: [
    { name: 'q1a', key: 'q1a', type: 'radio', options: ['q1a_1', 'q1a_2', 'q1a_3', 'q1a_98'] },
    { name: 'q2a', key: 'q2a', type: 'radio', options: ['q1a_1', 'q1a_2', 'q1a_3', 'q1a_98'] },
    { name: 'q3a', key: 'q3a', type: 'radio', options: ['q1a_1', 'q1a_2', 'q1a_3', 'q1a_98'] },
    { name: 'q4a', key: 'q4a', type: 'radio', options: ['q1a_1', 'q1a_2', 'q1a_3', 'q1a_98'] },
    { name: 'q5a', key: 'q5a', type: 'radio', options: ['q1a_1', 'q1a_2', 'q1a_3', 'q1a_98'] },
  ],
  section1a1: [
    { name: 'q6a', key: 'q6a', type: 'radio', options: ['q6a_1', 'q6a_2', 'q6a_98', 'q6a_99'] },
    { name: 'q7a', key: 'q7a', type: 'radio', options: ['q6a_1', 'q6a_2', 'q6a_98', 'q6a_99'] },
    { name: 'q8a', key: 'q8a', type: 'radio', options: ['q6a_1', 'q6a_2', 'q6a_98', 'q6a_99'] },
    { name: 'q9a', key: 'q9a', type: 'radio', options: ['q6a_1', 'q6a_2', 'q6a_98', 'q6a_99'] },
    { name: 'q10a', key: 'q10a', type: 'radio', options: ['q6a_1', 'q6a_2', 'q6a_98', 'q6a_99'] },
  ],
  section1b: [
    { name: 'q1b', key: 'q1b', type: 'radio', options: ['q1b_1', 'q1b_2', 'q1b_3', 'q1b_4', 'q1b_98'] },
    { name: 'q2b', key: 'q2b', type: 'radio', options: ['q1b_1', 'q1b_2', 'q1b_3', 'q1b_4', 'q1b_98'] },
    { name: 'q3b', key: 'q3b', type: 'radio', options: ['q1b_1', 'q1b_2', 'q1b_3', 'q1b_4', 'q1b_98'] },
    { name: 'q4b', key: 'q4b', type: 'radio', options: ['q1b_1', 'q1b_2', 'q1b_3', 'q1b_4', 'q1b_98'] },
    { name: 'q5b', key: 'q5b', type: 'radio', options: ['q1b_1', 'q1b_2', 'q1b_3', 'q1b_4', 'q1b_98'] },
  ],
  section1c: [
    { name: 'q1c', key: 'q1c', type: 'radio', options: ['q1c_1', 'q1c_2', 'q1c_3'] },
    { name: 'q2c', key: 'q2c', type: 'radio', options: ['q2c_1', 'q2c_2', 'q2c_3', 'q2c_4'] },
    { name: 'q3c', key: 'q3c', type: 'checkbox', options: ['q3c_1', 'q3c_2', 'q3c_3', 'q3c_4', 'q3c_5', 'q3c_6', 'q3c_7', 'q3c_8'] },
    { name: 'q4c', key: 'q4c', type: 'radio', options: ['q4c_1', 'q4c_2', 'q4c_3', 'q4c_4', 'q4c_5'] },
  ],
  section5c: [
    { name: 'q5c1', key: 'q5c1', type: 'radio', options: ['q5c_1', 'q5c_2', 'q5c_98', 'q5c_99'] },
    { name: 'q5c2', key: 'q5c2', type: 'radio', options: ['q5c_1', 'q5c_2', 'q5c_98', 'q5c_99'] },
    { name: 'q5c3', key: 'q5c3', type: 'radio', options: ['q5c_1', 'q5c_2', 'q5c_98', 'q5c_99'] },
  ],
  section6c: [
    { name: 'q6c', key: 'q6c', type: 'radio', options: ['q6c_1', 'q6c_2', 'q6c_3', 'q6c_4', 'q6c_5', 'q6c_6', 'q6c_7', 'q6c_8'] },
    { name: 'q7c', key: 'q7c', type: 'radio', options: ['q7c_1', 'q7c_2', 'q7c_3', 'q7c_4', 'q7c_5'] },
    { name: 'q8c', key: 'q8c', type: 'radio', options: ['q8c_1', 'q8c_2', 'q8c_3'] },
    { name: 'q9c', key: 'q9c', type: 'checkbox', options: ['q9c_1', 'q9c_2', 'q9c_3'] },
    { name: 'q10c', key: 'q10c', type: 'radio', options: ['q6a_1', 'q6a_2', 'q6a_98', 'q6a_99'] },
    { name: 'q11c', key: 'q11c', type: 'radio', options: ['q6a_1', 'q6a_2', 'q6a_98', 'q6a_99'] },
    { name: 'q12c', key: 'q12c', type: 'radio', options: ['q6a_1', 'q6a_2', 'q6a_98', 'q6a_99'] },
    { name: 'q13c', key: 'q13c', type: 'radio', options: ['q6a_1', 'q6a_2', 'q6a_98', 'q6a_99'] },
    { name: 'q14c', key: 'q14c', type: 'text', options: [] },
  ],
};

export const getQuestionsForSection = (section, locale = 'kh') => {
  const questionConfigs = SECTION_QUESTIONS[section] || [];
  
  return questionConfigs.map(config => {
    const questionText = t(locale, `client.questions.${config.key}`);
    const options = config.options.map(opt => {
      // Handle both string and object options
      let optKey, optValue;
      
      if (typeof opt === 'string') {
        // String format: 'q1a_1'
        optKey = opt;
        optValue = undefined; // Will be extracted from translation or key
      } else if (typeof opt === 'object' && opt !== null) {
        // Object format: { value: '1', key: 'q1a_3' }
        optKey = opt.key || opt.value;
        optValue = opt.value;
      } else {
        // Fallback for unexpected types
        console.warn('[questionHelper] Unexpected option type:', typeof opt, opt);
        optKey = String(opt);
        optValue = undefined;
      }
      
      // Get translation text
      const answerText = t(locale, `client.answers.${optKey}`);
      
      // Extract value from answer text (e.g., "1. Yes" -> "1")
      // Or use provided value, or extract from key
      let value;
      if (optValue !== undefined) {
        // Use explicitly provided value (e.g., from consent question)
        value = String(optValue);
      } else {
        // Try to extract number from answer text (e.g., "1. Yes" -> "1")
        const valueMatch = answerText.match(/^(\d+)/);
        if (valueMatch) {
          value = valueMatch[1];
        } else {
          // Fallback: extract from key (e.g., "q1a_1" -> "1")
          // This ensures we always have a value that matches backend expectations
          const keyParts = optKey && typeof optKey === 'string' ? optKey.split('_') : [];
          value = keyParts.length > 0 ? keyParts[keyParts.length - 1] : String(optKey);
        }
      }
      
      // Log for debugging (can be removed in production)
      if (__DEV__ && !value) {
        console.warn('[questionHelper] No value extracted for option:', { optKey, optValue, answerText, value });
      }
      
      return {
        value,
        label: answerText,
        text: answerText,
        key: optKey,
      };
    });

    return {
      name: config.name,
      text: questionText,
      label: questionText,
      type: config.type,
      options,
    };
  });
};

export const getSectionTitle = (section, locale = 'kh') => {
  const titleMap = {
    consent: t(locale, 'client.questions.title'),
    section1a: t(locale, 'client.questions.section_1A'),
    section1a1: t(locale, 'client.questions.section_1A1'),
    section1b: t(locale, 'client.questions.section_1B'),
    section1c: t(locale, 'client.questions.section_1C'),
    section5c: t(locale, 'client.questions.part5c1'),
    section6c: t(locale, 'client.questions.part6'),
  };
  
  return titleMap[section] || '';
};

export const getSectionContent = (section, locale = 'kh') => {
  const contentMap = {
    consent: t(locale, 'client.questions.acknowledge'),
    section1b: t(locale, 'client.questions.part1b'),
  };
  
  return contentMap[section] || '';
};

// Provider questionnaire helpers
const PROVIDER_SECTION_QUESTIONS = {
  consent: [
    {
      name: 'consent',
      key: 'consent',
      type: 'radio',
      options: [
        { value: '1', key: 'yesno_1' }, // Yes
        { value: '0', key: 'yesno_2' }, // No
      ],
    },
  ],
  section1: [
    {
      name: 'dept',
      key: 'dept',
      type: 'radio',
      options: ['d1_1', 'd1_2', 'd1_3', 'd1_4', 'd1_5', 'd1_6', 'd1_99'],
    },
    { name: 'e1', key: 'e1', type: 'radio', options: ['e1_1', 'e1_2', 'e1_98'] },
    { name: 'e2', key: 'e2', type: 'radio', options: ['e2_1', 'e2_2', 'e2_98'] },
    { name: 'e3', key: 'e3', type: 'radio', options: ['e3_1', 'e3_2', 'e3_98', 'e3_99'] },
    { name: 'e4', key: 'e4', type: 'radio', options: ['e4_1', 'e4_2', 'e4_3', 'e4_4'] },
    { name: 'e5', key: 'e5', type: 'radio', options: ['e5_1', 'e5_2', 'e5_3'] },
    { name: 'e6', key: 'e6', type: 'radio', options: ['e6_1', 'e6_2', 'e6_3', 'e6_4', 'e6_5'] },
  ],
};

export const getProviderQuestionsForSection = (section, locale = 'kh') => {
  const questionConfigs = PROVIDER_SECTION_QUESTIONS[section] || [];
  
  return questionConfigs.map(config => {
    const questionText = t(locale, `provider.questions.${config.key}`);
    const options = config.options.map(opt => {
      // Handle both string and object options
      let optKey, optValue;
      
      if (typeof opt === 'string') {
        optKey = opt;
        optValue = undefined;
      } else if (typeof opt === 'object' && opt !== null) {
        optKey = opt.key || opt.value;
        optValue = opt.value;
      } else {
        console.warn('[questionHelper] Unexpected option type:', typeof opt, opt);
        optKey = String(opt);
        optValue = undefined;
      }
      
      // Get translation text
      const answerText = t(locale, `provider.answers.${optKey}`);
      
      // Extract value from answer text or use provided value
      let value;
      if (optValue !== undefined) {
        value = String(optValue);
      } else {
        const valueMatch = answerText.match(/^(\d+)/);
        if (valueMatch) {
          value = valueMatch[1];
        } else {
          const keyParts = optKey && typeof optKey === 'string' ? optKey.split('_') : [];
          value = keyParts.length > 0 ? keyParts[keyParts.length - 1] : String(optKey);
        }
      }
      
      // Replace <br> tags in answer text
      const cleanAnswerText = answerText ? String(answerText).replace(/<br\s*\/?>/gi, '\n') : answerText;
      
      return {
        value,
        label: cleanAnswerText,
        text: cleanAnswerText,
        key: optKey,
      };
    });

    // Replace <br> tags in question text
    const cleanQuestionText = questionText ? String(questionText).replace(/<br\s*\/?>/gi, '\n') : questionText;
    
    return {
      name: config.name,
      text: cleanQuestionText,
      label: cleanQuestionText,
      type: config.type,
      options,
    };
  });
};

export const getProviderSectionTitle = (section, locale = 'kh') => {
  const titleMap = {
    consent: t(locale, 'provider.questions.title'),
    section1: t(locale, 'provider.questions.section1'),
  };
  
  return titleMap[section] || '';
};

export const getProviderSectionContent = (section, locale = 'kh') => {
  const contentMap = {
    consent: t(locale, 'provider.questions.consent'),
  };
  
  return contentMap[section] || '';
};
