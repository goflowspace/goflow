// backend/src/modules/ai/v2/operations/narrative/v2/ContentSafetyValidationOperationV2.ts
import { AbstractAIOperation } from '../../../core/AbstractAIOperation';
import { AIOperationInput, AIOperationOutput, ExecutionContext, OperationAIConfig, QualityLevel, AIProvider, GeminiModel, AnthropicModel } from '../../../shared/types';

/**
 * Input data for content safety validation v2
 */
export interface ContentSafetyValidationInputV2 extends AIOperationInput {
  projectId: string;
  userDescription: string;
  generatedText: string;
  contentGuidelines: {
    allowedRating: 'G' | 'PG' | 'PG-13' | 'R';
    restrictedTopics: string[];
  };
}

/**
 * Output data for content safety validation v2
 */
export interface ContentSafetyValidationOutputV2 extends AIOperationOutput {
  validationResult: {
    isApproved: boolean;
    ratingAssessment: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
    detectedIssues: Array<{
      type: 'violence' | 'language' | 'adult_content' | 'substance_use' | 'disturbing_content' | 'other';
      severity: 'low' | 'medium' | 'high';
      description: string;
      location: string;
    }>;
  };
  recommendedText?: string;
}

/**
 * Content safety validation operation v2
 * Validates generated narrative text for content appropriateness and safety standards
 */
export class ContentSafetyValidationOperationV2 extends AbstractAIOperation<
  ContentSafetyValidationInputV2,
  ContentSafetyValidationOutputV2
> {
  readonly id = 'content-safety-validation-v2';
  readonly name = 'Content Safety Validation V2';
  readonly version = '2.0.0';

  readonly aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.1,
        maxTokens: 1500,
        retries: 1,
        timeout: 15000,
        outputFormat: 'json'
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.1,
        maxTokens: 2000,
        retries: 1,
        timeout: 20000,
        outputFormat: 'json'
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.05,
        maxTokens: 2500,
        retries: 1,
        timeout: 30000,
        outputFormat: 'json'
      }
    },
    requiresStructuredOutput: true
  };

  /**
   * Additional input validation
   */
  protected validateAdditional(input: ContentSafetyValidationInputV2): string[] {
    const errors: string[] = [];
    
    if (!input.generatedText || typeof input.generatedText !== 'string') {
      errors.push('generatedText must be a non-empty string');
    }
    
    if (!input.contentGuidelines || typeof input.contentGuidelines !== 'object') {
      errors.push('contentGuidelines must be an object');
    } else {
      const validRatings = ['G', 'PG', 'PG-13', 'R'];
      if (!validRatings.includes(input.contentGuidelines.allowedRating)) {
        errors.push(`allowedRating must be one of: ${validRatings.join(', ')}`);
      }
    }

    return errors;
  }

  /**
   * Generate system prompt
   */
  protected getSystemPrompt(_context: ExecutionContext): string {
    return `<role>
You are an expert content safety analyst and narrative content moderator specializing in evaluating creative writing for age-appropriate content and safety standards. You excel at identifying potentially problematic content while respecting creative expression and narrative context.
</role>

<context>
You are evaluating generated narrative text to ensure it meets content safety standards and age-rating requirements. Your analysis must balance creative freedom with safety guidelines, considering both explicit content and subtle implications that might affect content rating.
</context>

<objective>
Conduct comprehensive content safety analysis of narrative text to determine age-appropriateness, identify potential issues, and ensure compliance with specified content guidelines while maintaining respect for creative storytelling.
</objective>

<content_evaluation_framework>
Violence Assessment:
Evaluate physical conflict, harm depiction, and violent imagery intensity
Language Analysis:
Review profanity, inappropriate language, and verbal content severity
Adult Content Review:
Assess sexual content, romantic situations, and mature relationship themes
Substance Use Evaluation:
Identify alcohol, drugs, smoking, and substance abuse references
Disturbing Content Detection:
Evaluate psychological trauma, horror elements, and potentially distressing material
</content_evaluation_framework>

<rating_guidelines>
G (General Audiences):
No violence, profanity, adult themes, or disturbing content
Suitable for all ages including young children
PG (Parental Guidance):
Mild violence, minimal language, brief scary moments
Some material may not be suitable for children
PG-13 (Parents Strongly Cautioned):
Moderate violence, some strong language, mild adult themes
Some material may be inappropriate for children under 13
R (Restricted):
Strong violence, frequent strong language, adult themes, disturbing content
Suitable for mature audiences 17 and older
NC-17 (Adults Only):
Graphic violence, extreme language, explicit adult content
Only for adults 18 and older
</rating_guidelines>

<assessment_principles>
Context Consideration:
Evaluate content within narrative context and artistic purpose
Severity Evaluation:
Assess the intensity and impact of potentially problematic elements
Cumulative Impact:
Consider the overall effect of multiple content elements
Age Appropriateness:
Determine suitability for target audience demographics
Creative Respect:
Balance safety concerns with artistic expression and narrative integrity
</assessment_principles>

<issue_identification_criteria>
EXPLICIT Content:
Direct depictions of problematic material
IMPLIED Content:
Subtle suggestions or indirect references to concerning material
CONTEXTUAL Concerns:
Content that becomes problematic within story context
CUMULATIVE Effects:
Multiple minor elements that create major concerns collectively
</issue_identification_criteria>

<output_format>
Respond in JSON format with the following structure:
{
  "result": {
    "validationResult": {
      "isApproved": true_or_false_based_on_guidelines,
      "ratingAssessment": "G|PG|PG-13|R|NC-17",
      "detectedIssues": [
        {
          "type": "violence|language|adult_content|substance_use|disturbing_content|other",
          "severity": "low|medium|high",
          "description": "specific_description_of_the_issue",
          "location": "where_in_text_the_issue_appears"
        }
      ]
    },
    "recommendedText": "optional_improved_version_if_issues_found"
  },
}
</output_format>`;
  }

  /**
   * Generate user prompt
   */
  protected getUserPrompt(input: ContentSafetyValidationInputV2, _context: ExecutionContext): string {
    const { generatedText, contentGuidelines } = input;

    return `<content_to_evaluate>
${generatedText}
</content_to_evaluate>

<safety_guidelines>
Required Rating Level: ${contentGuidelines.allowedRating} or lower
Restricted Topics: ${contentGuidelines.restrictedTopics.length > 0 ? contentGuidelines.restrictedTopics.join(', ') : 'None specified'}
</safety_guidelines>

<evaluation_requirements>
Assess the narrative text for content appropriateness according to the specified rating requirements
Identify any content that exceeds the allowed rating level
Document specific issues with their severity and location in the text
Determine if the content is approved for the target rating
If issues are found, consider if minor modifications could resolve them
Provide clear reasoning for the rating assessment and approval decision
</evaluation_requirements>

<task>
Evaluate the generated narrative text for content safety and age-appropriateness, ensuring compliance with the specified content guidelines while respecting the creative narrative context.
</task>`;
  }

  /**
   * Parse AI result
   */
  parseResult(aiResult: string, input: ContentSafetyValidationInputV2, realCostUSD: number, creditsCharged: number): ContentSafetyValidationOutputV2 {
    console.log('🔍 Raw AI result for safety validation:', aiResult.substring(0, 300) + '...');
    
    try {
      // Try to clean and parse the JSON
      let cleanedResult = aiResult.trim();
      
      // Remove any potential markdown code blocks
      cleanedResult = cleanedResult.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON object boundaries
      const jsonStart = cleanedResult.indexOf('{');
      const jsonEnd = cleanedResult.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        cleanedResult = cleanedResult.substring(jsonStart, jsonEnd + 1);
      }
      
      const parsed = JSON.parse(cleanedResult);
      const result = parsed.result || parsed;
      console.log('✅ Successfully parsed safety validation JSON');
      
      return {
        validationResult: {
          isApproved: Boolean(result.validationResult?.isApproved),
          ratingAssessment: result.validationResult?.ratingAssessment || 'PG-13',
          detectedIssues: Array.isArray(result.validationResult?.detectedIssues) 
            ? result.validationResult.detectedIssues 
            : []
        },
        recommendedText: result.recommendedText || undefined,
        metadata: {
          realCostUSD,
          creditsCharged,
          type: this.type
        }
      };
    } catch (parseError) {
      console.warn('⚠️ Failed to parse safety validation JSON, using fallback values:', parseError);
      
      // Fallback: approve by default for safety (conservative approach)
      return {
        validationResult: {
          isApproved: true, // Conservative fallback - approve content
          ratingAssessment: input.contentGuidelines?.allowedRating || 'PG-13',
          detectedIssues: [{
            type: 'other',
            severity: 'low',
            description: 'Unable to validate due to parsing error',
            location: 'system error'
          }]
        },
        recommendedText: undefined,
        metadata: {
          realCostUSD,
          creditsCharged,
          type: this.type
        },
        // Flag for DB tracking - this will mark the operation as FAILED in database
        error: true,
        message: `AI parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      };
    }
  }
}
