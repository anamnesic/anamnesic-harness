import { Logger } from '../utils/Logger';
import { DataSource } from 'typeorm';
import { SecurityAnalysisService } from './SecurityAnalysisService';
import { AdvancedSecurityAnalysisService } from './AdvancedSecurityAnalysisService';
import { IAIProvider } from '../providers/ai-provider';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Project Security Scanner
 * 
 * Connects security analysis services to real project files
 * and performs comprehensive security scans.
 */
export class ProjectSecurityScanner {
  private logger = Logger.getInstance('ProjectSecurityScanner');
  private securityService: SecurityAnalysisService;
  private advancedSecurityService: AdvancedSecurityAnalysisService;

  constructor(
    private db: DataSource,
    private aiProvider: IAIProvider
  ) {
    this.securityService = new SecurityAnalysisService(db);
    this.advancedSecurityService = new AdvancedSecurityAnalysisService(aiProvider);
  }

  /**
   * Perform basic security scan on project files
   */
  async scanProject(
    projectId: string,
    projectName: string,
    workspaceId: string,
    options: {
      deepScan?: boolean;
      filePatterns?: string[];
      excludePatterns?: string[];
    } = {}
  ): Promise<{
    id: string;
    vulnerabilityCount: number;
    severity: 'critical' | 'high' | 'medium' | 'low';
    durationMs: number;
    scanMethod: string;
    scannerVersion: string;
  }> {
    const startTime = Date.now();
    const { deepScan = false, filePatterns = ['**/*.{ts,tsx,js,jsx,json}'], excludePatterns = ['node_modules', '.git', 'dist'] } = options;

    this.logger.info(`Starting ${deepScan ? 'deep' : 'basic'} security scan`, {
      projectId,
      projectName,
      workspaceId,
    });

    try {
      // Get project path from project metadata
      const projectPath = await this.getProjectPath(projectId);
      if (!projectPath) {
        throw new Error(`Project path not found for project ${projectId}`);
      }

      // Find files to scan
      const files = await this.findProjectFiles(projectPath, filePatterns, excludePatterns);
      this.logger.info(`Found ${files.length} files to scan`);

      let vulnerabilities: any[] = [];
      let recommendations: any[] = [];
      let scanMethod = 'basic';
      let scannerVersion = '1.0.0';

      if (deepScan) {
        // Perform advanced AI-powered analysis
        this.logger.info('Performing deep security analysis with AI');
        scanMethod = 'advanced-ai';
        scannerVersion = '2.0.0';

        for (const file of files.slice(0, 10)) { // Limit to 10 files for deep scan
          try {
            const content = await fs.readFile(file.path, 'utf-8');
            const relativePath = path.relative(projectPath, file.path);
            
            const analysis = await this.advancedSecurityService.analyzeCode(content, file.language, {
              filename: relativePath,
              framework: await this.detectFramework(content, file.language),
            });

            // Convert advanced analysis results to security service format
            vulnerabilities.push(...this.convertAdvancedVulnerabilities(analysis.vulnerabilities, relativePath));
            recommendations.push(...this.convertAdvancedRecommendations(analysis.recommendations));
          } catch (error) {
            this.logger.warn(`Failed to analyze file ${file.path}`, { error });
          }
        }
      } else {
        // Perform basic pattern-based scanning
        this.logger.info('Performing basic pattern-based security analysis');
        
        for (const file of files) {
          try {
            const content = await fs.readFile(file.path, 'utf-8');
            const relativePath = path.relative(projectPath, file.path);
            
            const fileVulnerabilities = this.performBasicSecurityScan(content, file.language, relativePath);
            vulnerabilities.push(...fileVulnerabilities);
          } catch (error) {
            this.logger.warn(`Failed to scan file ${file.path}`, { error });
          }
        }

        // Generate basic recommendations
        recommendations = this.generateBasicRecommendations(vulnerabilities);
      }

      const durationMs = Date.now() - startTime;

      // Save analysis to database
      const analysis = await this.securityService.create({
        workspaceId,
        targetId: projectId,
        targetName: projectName,
        type: 'code',
        vulnerabilities,
        recommendations,
        scanMethod,
        durationMs,
        scannerVersion,
      });

      this.logger.info(`Security scan completed`, {
        analysisId: analysis.id,
        vulnerabilityCount: vulnerabilities.length,
        severity: analysis.severity,
        durationMs,
      });

      return {
        id: analysis.id,
        vulnerabilityCount: vulnerabilities.length,
        severity: analysis.severity,
        durationMs,
        scanMethod,
        scannerVersion,
      };

    } catch (error) {
      this.logger.error('Security scan failed', { error });
      throw error;
    }
  }

  /**
   * Get project path from database
   */
  private async getProjectPath(projectId: string): Promise<string | null> {
    try {
      const { Project } = await import('../entities/Project');
      const repo = this.db.getRepository(Project);
      const project = await repo.findOne({ where: { id: projectId } });
      if (!project) return null;
      const metadata = project.metadata as Record<string, any> | null;
      return metadata?.localPath || metadata?.path || null;
    } catch (error) {
      this.logger.error('Failed to get project path', { error });
      return null;
    }
  }

  /**
   * Find files in project matching patterns
   */
  private async findProjectFiles(
    projectPath: string,
    includePatterns: string[],
    excludePatterns: string[]
  ): Promise<Array<{ path: string; language: string }>> {
    const files: Array<{ path: string; language: string }> = [];

    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(projectPath, entry.name);
        
        // Skip excluded patterns
        if (excludePatterns.some(pattern => fullPath.includes(pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.findProjectFiles(fullPath, includePatterns, excludePatterns);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Check if file matches include patterns
          const relativePath = path.relative(projectPath, fullPath);
          const language = this.detectLanguage(fullPath);
          
          if (language && this.matchesPattern(relativePath, includePatterns)) {
            files.push({ path: fullPath, language });
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to scan directory ${projectPath}`, { error });
    }

    return files;
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
    };
    return languageMap[ext] || 'unknown';
  }

  /**
   * Check if file path matches any pattern
   */
  private matchesPattern(filePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      // Simple glob pattern matching
      const regex = new RegExp(
        pattern.replace(/\*\*/g, '.*')
               .replace(/\*/g, '[^/]*')
               .replace(/\?/g, '[^/]')
      );
      return regex.test(filePath);
    });
  }

  /**
   * Perform basic pattern-based security scanning
   */
  private performBasicSecurityScan(content: string, language: string, filePath: string): any[] {
    const vulnerabilities: any[] = [];
    const lines = content.split('\n');

    // Common security patterns
    const securityPatterns = [
      {
        name: 'Hardcoded Secret',
        pattern: /(password|secret|key|token)\s*[:=]\s*['"`][^'"`]+['"`]/i,
        severity: 'high',
        description: 'Potential hardcoded secret detected',
      },
      {
        name: 'SQL Injection',
        pattern: /(execute|query)\s*\(\s*['"`].*\+.*['"`]/i,
        severity: 'critical',
        description: 'Potential SQL injection vulnerability',
      },
      {
        name: 'XSS Vulnerability',
        pattern: /(innerHTML|outerHTML)\s*=.*\+/i,
        severity: 'high',
        description: 'Potential cross-site scripting vulnerability',
      },
      {
        name: 'Eval Usage',
        pattern: /eval\s*\(/i,
        severity: 'critical',
        description: 'Use of eval() function is dangerous',
      },
      {
        name: 'Unsafe Regex',
        pattern: /RegExp\s*\(\s*['"`][^'"`]*['"`]\s*\)/i,
        severity: 'medium',
        description: 'Potential unsafe regular expression',
      },
    ];

    lines.forEach((line, index) => {
      securityPatterns.forEach(pattern => {
        if (pattern.pattern.test(line)) {
          vulnerabilities.push({
            id: `basic-${Date.now()}-${index}`,
            type: 'pattern',
            severity: pattern.severity,
            title: pattern.name,
            description: pattern.description,
            location: { file: filePath, line: index + 1, column: 0 },
            evidence: line.trim(),
            remediationSteps: [`Review and fix the security issue in ${filePath} at line ${index + 1}`],
            references: [],
          });
        }
      });
    });

    return vulnerabilities;
  }

  /**
   * Detect framework from code content
   */
  private async detectFramework(content: string, language: string): Promise<string> {
    if (language === 'typescript' || language === 'javascript') {
      if (content.includes('react') || content.includes('JSX')) return 'react';
      if (content.includes('express')) return 'express';
      if (content.includes('next')) return 'nextjs';
      if (content.includes('vue')) return 'vue';
      if (content.includes('angular')) return 'angular';
    }
    return 'unknown';
  }

  /**
   * Convert advanced vulnerabilities to security service format
   */
  private convertAdvancedVulnerabilities(advancedVulns: any[], filePath: string): any[] {
    return advancedVulns.map(vuln => ({
      id: vuln.id,
      type: vuln.type,
      severity: vuln.severity,
      title: vuln.title,
      description: vuln.description,
      location: vuln.lineNumbers ? { 
        file: filePath, 
        line: vuln.lineNumbers[0], 
        column: 0 
      } : undefined,
      evidence: vuln.codeSnippet,
      remediationSteps: [`Address ${vuln.title} in ${filePath}`],
      references: vuln.cveId ? [`CVE-${vuln.cveId}`] : [],
      cvss: vuln.cvssScore,
    }));
  }

  /**
   * Convert advanced recommendations to security service format
   */
  private convertAdvancedRecommendations(advancedRecs: any[]): any[] {
    return advancedRecs.map(rec => ({
      priority: rec.priority,
      title: rec.title,
      description: rec.description,
      steps: rec.steps,
      timeEstimateHours: rec.estimatedEffort === 'minimal' ? 1 : 
                          rec.estimatedEffort === 'low' ? 4 :
                          rec.estimatedEffort === 'medium' ? 8 : 16,
    }));
  }

  /**
   * Generate basic recommendations from vulnerabilities
   */
  private generateBasicRecommendations(vulnerabilities: any[]): any[] {
    const recommendations: any[] = [];
    const severityCount = vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {});

    if (severityCount.critical > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Address Critical Security Issues',
        description: `Found ${severityCount.critical} critical vulnerabilities that require immediate attention`,
        steps: [
          'Review and fix all critical vulnerabilities',
          'Implement secure coding practices',
          'Run security scans regularly',
        ],
        timeEstimateHours: severityCount.critical * 2,
      });
    }

    if (severityCount.high > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Fix High-Severity Vulnerabilities',
        description: `Found ${severityCount.high} high-severity vulnerabilities`,
        steps: [
          'Prioritize high-severity fixes',
          'Update dependencies if needed',
          'Add input validation and sanitization',
        ],
        timeEstimateHours: severityCount.high * 1,
      });
    }

    return recommendations;
  }
}
