// backend/src/modules/ai/v2/operations/TargetAudienceGenerationOperation.ts
import {
  AbstractBibleGenerationOperation,
  BibleGenerationInput
} from '../../core/AbstractBibleGenerationOperation';
import {
  AIOperationOutput,
  AIProvider,
  AnthropicModel,
  ExecutionContext,
  GeminiModel,
  OperationAIConfig,
  QualityLevel
} from '../../shared/types';
import { CostService } from '../../services/CostService';
import { USD_PER_CREDIT } from '../../config/OperationCreditConfig';

// --- I/O Interfaces ---

export interface TargetAudienceGenerationInput extends BibleGenerationInput {}

export interface TargetAudienceGenerationOutput extends AIOperationOutput {
  targetAudience: string;
}

/**
 * Operation to generate project target audience using the new v2 architecture.
 */
export class TargetAudienceGenerationOperation extends AbstractBibleGenerationOperation<
  TargetAudienceGenerationInput,
  TargetAudienceGenerationOutput
> {
  id = 'target-audience-generation-v2';
  name = 'Target Audience Generation';
  version = '2.0.0';

  aiConfig: OperationAIConfig = {
    modeConfigs: {
      [QualityLevel.FAST]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH_LITE,
        temperature: 0.6,
        maxTokens: 1000,
        retries: 2,
        timeout: 20000      
      },
      [QualityLevel.STANDARD]: {
        provider: AIProvider.GEMINI,
        model: GeminiModel.FLASH,
        temperature: 0.6,
        maxTokens: 1000,
        retries: 2,
        timeout: 20000      
      },
      [QualityLevel.EXPERT]: {
        provider: AIProvider.ANTHROPIC,
        model: AnthropicModel.SONNET,
        temperature: 0.7,
        maxTokens: 2000,
        retries: 1,
        timeout: 40000      
      }
    }
  };

  // --- Prompt Generation ---

  protected getSystemPrompt(context: ExecutionContext): string {
    const config = this.aiConfig.modeConfigs[context.qualityLevel];
    const systemBase = 
    
    `<role>
    You are a strategic marketing analyst and consumer behavior expert specializing in audience segmentation for creative and entertainment industries. You have deep expertise in demographic analysis, psychographic profiling, digital media consumption patterns, and modern audience development strategies.
    </role>

    <context>
    You are creating a comprehensive target audience profile for a creative project that will inform marketing strategy, content positioning, platform selection, monetization approaches, and community building efforts. The analysis must be specific, actionable, and grounded in realistic consumer behavior data.
    </context>

    <text_formatting>
    Use plain text without any formatting
    Use paragraphs to separate sections
    </text_formatting>

    <objective>
    Generate a detailed, multi-layered audience analysis that identifies primary and secondary audience segments with specific demographic, psychographic, behavioral, and motivational characteristics that enable effective audience targeting and engagement.
    </objective>`;

    return `${systemBase}\n${config.systemPromptSuffix || ''}`;
  }

  protected getUserPrompt(input: TargetAudienceGenerationInput, _context: ExecutionContext): string {
    const contextPrompt = this.buildContextPrompt(input);

    return `<input_data>

<primary_content>
${contextPrompt}
</primary_content>

</input_data>

<task_definition>

<analysis_components>
Primary Audience Segment:
Most likely core consumers with detailed demographic and psychographic profiles
Secondary Audience Segments:
Additional groups that may engage with the content  
Behavioral Patterns:
How these audiences discover, consume, and share content
Platform Preferences:
Where they spend time and how they engage with media
Motivational Drivers:
What they seek from this type of content experience
Engagement Characteristics:
How they interact with creators and communities
</analysis_components>

</task_definition>

<constraints>

<hard_constraints>
Length is 200-400 words across 3-5 paragraphs
Include specific age ranges, not vague terms like "young people"
Focus on actionable insights for marketing and content strategy
Base recommendations on realistic consumer behavior patterns
Identify both primary (60-70%) and secondary (20-30%) audience segments
Include platform and media consumption preferences
</hard_constraints>

<soft_constraints>
Avoid overly broad demographics ("everyone who likes fantasy")
Balance demographic data with psychographic insights
Consider cross-platform and multi-generational appeal where relevant
Include emerging trends in media consumption
Address potential niche vs. mainstream appeal
Consider global vs. regional audience characteristics
</soft_constraints>

</constraints>

<audience_analysis_framework>

<demographic_factors>
Age Range:
Specific age brackets (e.g., 16-24, 25-34, 35-44)
Gender Distribution:
Primary and secondary gender appeal
Geographic Scope:
Regional, national, or international appeal
Economic Status:
Disposable income and spending patterns on entertainment
Education Level:
Relevance to content complexity and themes
Life Stage:
Students, young professionals, parents, retirees, etc.
</demographic_factors>

<psychographic_factors>
Values and Beliefs:
Core values that resonate with content themes
Lifestyle Preferences:
How they spend leisure time and money
Personality Traits:
Introverted vs. extroverted, risk-taking vs. conservative
Interests and Hobbies:
Related activities and fandoms
Social Attitudes:
Progressive vs. traditional, individualistic vs. community-oriented
Cultural Influences:
Subcultures, fandoms, or communities they belong to
</psychographic_factors>

<behavioral_patterns>
Content Discovery:
How they find new entertainment (algorithms, friends, reviews, etc.)
Consumption Habits:
Binge vs. episodic, solo vs. social, device preferences
Platform Usage:
Primary platforms for different types of content consumption
Sharing Behavior:
How and what they share with their networks
Purchase Decisions:
What influences their entertainment spending
Community Engagement:
How they interact with creators and other fans
</behavioral_patterns>

</audience_analysis_framework>

<output_specification>

<format>
3-5 paragraphs, 200-400 words total, with clear segmentation and actionable insights for marketing and content strategy.
</format>

<validation_criteria>
Specific age ranges and demographic details provided
Clear distinction between primary and secondary audiences
Realistic assessment based on genre and content type
Actionable insights for marketing and platform strategy
Balance of demographic and psychographic information
Evidence of understanding modern media consumption patterns
Practical implications for audience development and engagement
</validation_criteria>

</output_specification>

Based on the provided project context, create a comprehensive target audience analysis that provides strategic insights for effective audience development and engagement.`;
  }

  // --- Result Parsing ---

  parseResult(
    aiResult: string,
    _input: TargetAudienceGenerationInput,
    realCostUSD: number,
    creditsCharged: number,
  ): TargetAudienceGenerationOutput {
    const cleanedAudience = aiResult.trim().replace(/^(целевая аудитория|target audience|аудитория):\s*/i, '');
    
    return {
      targetAudience: cleanedAudience,
      metadata: {
        realCostUSD,
        creditsCharged,
        margin: CostService.calculateMargin(realCostUSD, creditsCharged, USD_PER_CREDIT)
      }
    };
  }
}

