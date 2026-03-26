/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Search, Loader2, TrendingUp, TrendingDown, Briefcase, Map, AlertCircle, ChevronUp, ChevronDown, Edit2, Globe } from 'lucide-react';
import { AutocompleteInput } from './components/AutocompleteInput';

interface SalaryData {
  primaryLabel: string; // Location name or Profession name
  minSalary: number;
  maxSalary: number;
  meanSalary: number;
  baselineMean: number; // Location overall mean or National profession mean
  localCurrencyCode: string;
  localMeanSalary: number;
}

interface CompareData {
  label: string;
  item1: {
    minSalary: number;
    maxSalary: number;
    meanSalary: number;
    baselineMean: number;
    localCurrencyCode: string;
    localMeanSalary: number;
    crossCurrencyCode?: string;
    crossMeanSalary?: number;
  };
  item2: {
    minSalary: number;
    maxSalary: number;
    meanSalary: number;
    baselineMean: number;
    localCurrencyCode: string;
    localMeanSalary: number;
    crossCurrencyCode?: string;
    crossMeanSalary?: number;
  };
}

export default function App() {
  const [query, setQuery] = useState('');
  const [compareQuery, setCompareQuery] = useState('');
  const [locationFilter1, setLocationFilter1] = useState('');
  const [locationFilter2, setLocationFilter2] = useState('');
  const [data, setData] = useState<SalaryData[]>([]);
  const [compareData, setCompareData] = useState<CompareData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);

  // Set default queries
  useEffect(() => {
    if (!hasSearched) {
      setQuery('Software Engineer');
      setCompareQuery('');
      setLocationFilter1('');
      setLocationFilter2('');
    }
  }, [hasSearched]);

  const formatCurrency = (value: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setHasSearched(true);
    setData([]);
    setCompareData([]);

    try {
      setIsHeaderExpanded(false);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const itemSchema = {
        type: Type.OBJECT,
        properties: {
          minSalary: { type: Type.NUMBER },
          maxSalary: { type: Type.NUMBER },
          meanSalary: { type: Type.NUMBER },
          baselineMean: { type: Type.NUMBER },
          localCurrencyCode: { type: Type.STRING },
          localMeanSalary: { type: Type.NUMBER },
          crossCurrencyCode: { type: Type.STRING },
          crossMeanSalary: { type: Type.NUMBER },
        },
        required: ['minSalary', 'maxSalary', 'meanSalary', 'baselineMean', 'localCurrencyCode', 'localMeanSalary'],
      };

      if (compareQuery.trim() || (locationFilter1.trim() && locationFilter2.trim())) {
        const hasTwoProfs = !!compareQuery.trim();
        const hasTwoLocations = !!locationFilter1.trim() && !!locationFilter2.trim();
        const singleLocation = locationFilter1.trim() || locationFilter2.trim();
        
        const locTerm = 'location';
        const locTermPlural = 'locations';
        const currencyNote = ' Provide all salary data converted to USD for accurate comparison, but also include the localCurrencyCode (e.g., "EUR", "JPY") and localMeanSalary (the mean salary in that local currency). If comparing two different locations, also provide crossCurrencyCode (the currency of the OTHER location being compared) and crossMeanSalary (the mean salary converted to the OTHER location\'s currency).';

        let prompt = '';
        if (hasTwoProfs && hasTwoLocations) {
          prompt = `Generate realistic annual salary data${currencyNote} comparing the professions "${query}" and "${compareQuery}" in exactly two ${locTermPlural}: "${locationFilter1}" and "${locationFilter2}".
          For each ${locTerm}, provide:
          - label: The ${locTerm} name
          - item1: Data for ${query} (minSalary, maxSalary, meanSalary, baselineMean which is the overall average salary across ALL professions in this ${locTerm}, localCurrencyCode, localMeanSalary, crossCurrencyCode, crossMeanSalary)
          - item2: Data for ${compareQuery} (minSalary, maxSalary, meanSalary, baselineMean which is the overall average salary across ALL professions in this ${locTerm}, localCurrencyCode, localMeanSalary, crossCurrencyCode, crossMeanSalary)`;
        } else if (hasTwoProfs && singleLocation) {
          prompt = `Generate realistic annual salary data${currencyNote} comparing the professions "${query}" and "${compareQuery}" in the ${locTerm} of "${singleLocation}".
          Provide exactly 1 item in the array:
          - label: The ${locTerm} name ("${singleLocation}")
          - item1: Data for ${query} (minSalary, maxSalary, meanSalary, baselineMean which is the overall average salary across ALL professions in this ${locTerm}, localCurrencyCode, localMeanSalary)
          - item2: Data for ${compareQuery} (minSalary, maxSalary, meanSalary, baselineMean which is the overall average salary across ALL professions in this ${locTerm}, localCurrencyCode, localMeanSalary)`;
        } else if (hasTwoProfs) {
          prompt = `Generate realistic annual salary data${currencyNote} comparing the professions "${query}" and "${compareQuery}" across 20 diverse ${locTermPlural}. Include a mix of high, medium, and low cost of living ${locTermPlural}.
          For each ${locTerm}, provide:
          - label: The ${locTerm} name
          - item1: Data for ${query} (minSalary, maxSalary, meanSalary, baselineMean which is the overall average salary across ALL professions in this ${locTerm}, localCurrencyCode, localMeanSalary)
          - item2: Data for ${compareQuery} (minSalary, maxSalary, meanSalary, baselineMean which is the overall average salary across ALL professions in this ${locTerm}, localCurrencyCode, localMeanSalary)`;
        } else if (hasTwoLocations) {
          prompt = `Generate realistic annual salary data${currencyNote} for the profession "${query}" comparing the ${locTermPlural} of "${locationFilter1}" and "${locationFilter2}".
          For the profession, provide:
          - label: The profession name ("${query}")
          - item1: Data for ${locationFilter1} (minSalary, maxSalary, meanSalary, baselineMean which is the overall average salary across ALL professions in ${locationFilter1}, localCurrencyCode, localMeanSalary, crossCurrencyCode, crossMeanSalary)
          - item2: Data for ${locationFilter2} (minSalary, maxSalary, meanSalary, baselineMean which is the overall average salary across ALL professions in ${locationFilter2}, localCurrencyCode, localMeanSalary, crossCurrencyCode, crossMeanSalary)`;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  item1: itemSchema,
                  item2: itemSchema,
                },
                required: ['label', 'item1', 'item2'],
              },
            },
          },
        });

        if (response.text) {
          const parsedData = JSON.parse(response.text) as CompareData[];
          parsedData.sort((a, b) => a.label.localeCompare(b.label));
          setCompareData(parsedData);
        } else {
          throw new Error('No data returned from AI.');
        }
      } else {
        let prompt = '';
        const singleLocation = locationFilter1.trim() || locationFilter2.trim();
        const locTerm = 'location';
        const locTermPlural = 'locations';
        const diverseExamples = 'New York City, London, Tokyo, Rural India, Texas, Paris, etc.';
        const currencyNote = ' Provide all salary data converted to USD for accurate comparison, but also include the localCurrencyCode (e.g., "EUR", "JPY") and localMeanSalary (the mean salary in that local currency).';

        if (singleLocation) {
          prompt = `Generate realistic annual salary data${currencyNote} for the profession "${query}" in the ${locTerm} of "${singleLocation}". 
          Provide exactly 1 item in the array:
          - primaryLabel: The ${locTerm} name ("${singleLocation}")
          - minSalary: Minimum expected salary for this profession
          - maxSalary: Maximum expected salary for this profession
          - meanSalary: Average salary for this profession in this ${locTerm}
          - baselineMean: The overall average salary across ALL professions in that specific ${locTerm}.
          - localCurrencyCode: Local currency code
          - localMeanSalary: Mean salary in local currency`;
        } else {
          prompt = `Generate realistic annual salary data${currencyNote} for the profession "${query}" across 25 diverse ${locTermPlural} (include a mix of high, medium, and low cost of living ${locTermPlural} like ${diverseExamples}). 
          For each ${locTerm}, provide:
          - primaryLabel: The ${locTerm} name
          - minSalary: Minimum expected salary for this profession
          - maxSalary: Maximum expected salary for this profession
          - meanSalary: Average salary for this profession in this ${locTerm}
          - baselineMean: The overall average salary across ALL professions in that specific ${locTerm}.
          - localCurrencyCode: Local currency code
          - localMeanSalary: Mean salary in local currency`;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  primaryLabel: { type: Type.STRING },
                  minSalary: { type: Type.NUMBER },
                  maxSalary: { type: Type.NUMBER },
                  meanSalary: { type: Type.NUMBER },
                  baselineMean: { type: Type.NUMBER },
                  localCurrencyCode: { type: Type.STRING },
                  localMeanSalary: { type: Type.NUMBER },
                },
                required: ['primaryLabel', 'minSalary', 'maxSalary', 'meanSalary', 'baselineMean', 'localCurrencyCode', 'localMeanSalary'],
              },
            },
          },
        });

        if (response.text) {
          const parsedData = JSON.parse(response.text) as SalaryData[];
          parsedData.sort((a, b) => a.primaryLabel.localeCompare(b.primaryLabel));
          setData(parsedData);
        } else {
          throw new Error('No data returned from AI.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const getCompareHeaders = () => {
    const locLabel = 'Location';
    if (compareQuery && locationFilter1 && locationFilter2) {
      return {
        title: `Comparing ${query} vs ${compareQuery} in ${locationFilter1} & ${locationFilter2}`,
        col1: locLabel,
        col2: query,
        col3: compareQuery
      };
    } else if (compareQuery && (locationFilter1 || locationFilter2)) {
      const singleLocation = locationFilter1 || locationFilter2;
      return {
        title: `Comparing ${query} vs ${compareQuery} in ${singleLocation}`,
        col1: locLabel,
        col2: query,
        col3: compareQuery
      };
    } else if (compareQuery) {
      return {
        title: `Comparing Professions: ${query} vs ${compareQuery}`,
        col1: locLabel,
        col2: query,
        col3: compareQuery
      };
    } else if (locationFilter1 && locationFilter2) {
      return {
        title: `Comparing ${query} in ${locationFilter1} vs ${locationFilter2}`,
        col1: 'Profession',
        col2: locationFilter1,
        col3: locationFilter2
      };
    }
    return { title: 'Comparison', col1: 'Item', col2: 'Item 1', col3: 'Item 2' };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex justify-between items-center w-full sm:w-auto">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Salary Explorer
                </h1>
                {isHeaderExpanded && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    AI-powered global salary insights and regional variance analysis.
                  </p>
                )}
              </div>
              
              {/* Mobile toggle button when collapsed */}
              {!isHeaderExpanded && (
                <button 
                  onClick={() => setIsHeaderExpanded(true)}
                  className="sm:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Desktop edit button when collapsed */}
            {!isHeaderExpanded && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md flex items-center gap-2">
                  <span className="font-medium">Profession:</span>
                  {query}
                  {compareQuery && <><span className="text-slate-400 mx-1">vs</span>{compareQuery}</>}
                  {(locationFilter1 || locationFilter2) && (
                    <>
                      <span className="text-slate-400 mx-1">in</span>
                      {locationFilter1}
                      {locationFilter2 && <><span className="text-slate-400 mx-1">vs</span>{locationFilter2}</>}
                    </>
                  )}
                </div>
                <button
                  onClick={() => setIsHeaderExpanded(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Search
                </button>
              </div>
            )}
          </div>

          {/* Search Bar (hidden when collapsed) */}
          {isHeaderExpanded && (
            <form onSubmit={handleSearch} className="mt-4 sm:mt-6 flex flex-col gap-3 max-w-4xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <AutocompleteInput
                  value={query}
                  onChange={setQuery}
                  placeholder="e.g. Registered Nurse..."
                  icon={<Briefcase className="h-5 w-5 text-slate-400" />}
                  type="profession"
                />
                
                <div className="flex items-center justify-center px-2 text-slate-400 font-bold italic hidden sm:flex">VS</div>
                
                <AutocompleteInput
                  value={compareQuery}
                  onChange={setCompareQuery}
                  placeholder="Compare profession (optional)..."
                  icon={<Briefcase className="h-5 w-5 text-slate-400" />}
                  type="profession"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                  <AutocompleteInput
                    value={locationFilter1}
                    onChange={setLocationFilter1}
                    placeholder="Filter by Location 1 (optional)..."
                    icon={<Globe className="h-5 w-5 text-slate-400" />}
                    type="location"
                  />
                  
                  <div className="flex items-center justify-center px-2 text-slate-400 font-bold italic hidden sm:flex">VS</div>
                  
                  <AutocompleteInput
                    value={locationFilter2}
                    onChange={setLocationFilter2}
                    placeholder="Filter by Location 2 (optional)..."
                    icon={<Globe className="h-5 w-5 text-slate-400" />}
                    type="location"
                  />

                  <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors w-full sm:w-auto"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Analyze'}
                  </button>
                </div>
            </form>
          )}
          
          {/* Mobile collapsed summary */}
          {!isHeaderExpanded && (
            <div className="sm:hidden mt-3 text-sm text-slate-600 bg-slate-100 px-3 py-2 rounded-md flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              <span className="font-medium">Profession:</span>
              {query}
              {compareQuery && <><span className="text-slate-400 mx-1">vs</span>{compareQuery}</>}
              {(locationFilter1 || locationFilter2) && (
                <>
                  <span className="text-slate-400 mx-1">in</span>
                  {locationFilter1}
                  {locationFilter2 && <><span className="text-slate-400 mx-1">vs</span>{locationFilter2}</>}
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Analysis Failed</h3>
              <p className="text-sm mt-1 text-red-600">{error}</p>
            </div>
          </div>
        )}

        {!hasSearched && !loading && data.length === 0 && compareData.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Ready to explore</h2>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              Enter a profession above to generate a comprehensive salary analysis and variance report.
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-slate-900">Analyzing Data...</h2>
            <p className="text-slate-500 mt-1">Gathering insights across the globe.</p>
          </div>
        )}

        {compareData.length > 0 && !loading && (
          <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">
                {getCompareHeaders().title}
              </h2>
              <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                {compareData.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th rowSpan={2} className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200 align-bottom">
                      {getCompareHeaders().col1}
                    </th>
                    <th colSpan={2} className="px-6 py-3 text-center text-xs font-semibold text-slate-900 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-100/50">
                      {getCompareHeaders().col2}
                    </th>
                    <th colSpan={2} className="px-6 py-3 text-center text-xs font-semibold text-slate-900 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-100/50">
                      {getCompareHeaders().col3}
                    </th>
                    <th rowSpan={2} className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider align-bottom">
                      Difference
                    </th>
                  </tr>
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Mean Salary</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200 bg-slate-50">Variance</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Mean Salary</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-200 bg-slate-50">Variance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {compareData.map((row, idx) => {
                    const var1 = row.item1.meanSalary - row.item1.baselineMean;
                    const var1Pct = (var1 / row.item1.baselineMean) * 100;
                    const isPos1 = var1 > 0;

                    const var2 = row.item2.meanSalary - row.item2.baselineMean;
                    const var2Pct = (var2 / row.item2.baselineMean) * 100;
                    const isPos2 = var2 > 0;

                    const diff = row.item1.meanSalary - row.item2.meanSalary;
                    const isDiffPos = diff > 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 border-r border-slate-200">
                          {row.label}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 text-right font-mono">
                          <div className="flex flex-col items-end">
                            <span>{formatCurrency(row.item1.meanSalary)}</span>
                            {row.item1.localCurrencyCode && row.item1.localCurrencyCode !== 'USD' && (
                              <span className="text-xs text-slate-500 font-normal">
                                {formatCurrency(row.item1.localMeanSalary, row.item1.localCurrencyCode)}
                              </span>
                            )}
                            {row.item1.crossCurrencyCode && row.item1.crossMeanSalary != null && row.item1.crossCurrencyCode !== 'USD' && row.item1.crossCurrencyCode !== row.item1.localCurrencyCode && (
                              <span className="text-xs text-slate-500 font-normal">
                                {formatCurrency(row.item1.crossMeanSalary, row.item1.crossCurrencyCode)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right border-r border-slate-200">
                          <div className={`inline-flex items-center gap-1.5 font-medium ${isPos1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPos1 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="text-xs">
                              {isPos1 ? '+' : ''}{var1Pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 text-right font-mono">
                          <div className="flex flex-col items-end">
                            <span>{formatCurrency(row.item2.meanSalary)}</span>
                            {row.item2.localCurrencyCode && row.item2.localCurrencyCode !== 'USD' && (
                              <span className="text-xs text-slate-500 font-normal">
                                {formatCurrency(row.item2.localMeanSalary, row.item2.localCurrencyCode)}
                              </span>
                            )}
                            {row.item2.crossCurrencyCode && row.item2.crossMeanSalary != null && row.item2.crossCurrencyCode !== 'USD' && row.item2.crossCurrencyCode !== row.item2.localCurrencyCode && (
                              <span className="text-xs text-slate-500 font-normal">
                                {formatCurrency(row.item2.crossMeanSalary, row.item2.crossCurrencyCode)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right border-r border-slate-200">
                          <div className={`inline-flex items-center gap-1.5 font-medium ${isPos2 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPos2 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span className="text-xs">
                              {isPos2 ? '+' : ''}{var2Pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className={`inline-flex items-center gap-1.5 font-medium ${isDiffPos ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <span className="font-mono">
                              {isDiffPos ? '+' : ''}{formatCurrency(Math.abs(diff))}
                            </span>
                            <span className="text-xs opacity-75 ml-1">
                              {isDiffPos ? `more in ${getCompareHeaders().col2}` : `more in ${getCompareHeaders().col3}`}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
              <p>
                <strong>Note:</strong> Data is generated by AI based on generalized statistical models. "Variance" shows how this profession compares to that country's overall average salary.
              </p>
            </div>
          </div>
        )}

        {data.length > 0 && !loading && (
          <div className="bg-white shadow-sm border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-900">
                Salary Analysis: {query}
              </h2>
              <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                {data.length} records
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Min Salary
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Max Salary
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Mean Salary
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Location Avg
                    </th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Variance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {data.map((row, idx) => {
                    const varianceValue = row.meanSalary - row.baselineMean;
                    const variancePercent = (varianceValue / row.baselineMean) * 100;
                    const isPositive = varianceValue > 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {row.primaryLabel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right font-mono">
                          {formatCurrency(row.minSalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-right font-mono">
                          {formatCurrency(row.maxSalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 text-right font-mono">
                          <div className="flex flex-col items-end">
                            <span>{formatCurrency(row.meanSalary)}</span>
                            {row.localCurrencyCode && row.localCurrencyCode !== 'USD' && (
                              <span className="text-xs text-slate-500 font-normal">
                                {formatCurrency(row.localMeanSalary, row.localCurrencyCode)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-right font-mono">
                          {formatCurrency(row.baselineMean)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <div className={`inline-flex items-center gap-1.5 font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="font-mono">
                              {isPositive ? '+' : ''}{formatCurrency(varianceValue)}
                            </span>
                            <span className="text-xs opacity-75 ml-1">
                              ({isPositive ? '+' : ''}{variancePercent.toFixed(1)}%)
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
              <p>
                <strong>Note:</strong> Data is generated by AI based on generalized statistical models and should be used for informational purposes only. "Location Avg" represents the mean salary across all professions in that location. "Variance" shows how this specific profession compares to that location's overall average.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
