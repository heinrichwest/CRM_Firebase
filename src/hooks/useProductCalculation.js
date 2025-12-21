/**
 * useProductCalculation Hook
 *
 * A hook that provides calculation functionality for products.
 * Supports both legacy hard-coded calculations and new template-based calculations.
 */

import { useState, useCallback } from 'react'
import { useTenant } from '../context/TenantContext'
import { getProduct } from '../services/firestoreService'
import { getCalculationTemplate } from '../services/calculationTemplateService'
import {
  calculateTotal,
  calculateCosts,
  calculateGrossProfit,
  calculateMonthlyDistribution
} from '../services/calculationEngine'
import { getEffectiveListOptions } from '../services/tenantProductConfigService'

/**
 * Hook for product calculations
 * @param {Object} options - Hook options
 * @returns {Object} - Calculation functions and state
 */
export const useProductCalculation = (options = {}) => {
  const { currentTenant } = useTenant()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const tenantId = currentTenant?.id

  /**
   * Check if a product uses the new template system
   */
  const usesTemplateSystem = useCallback(async (productId) => {
    try {
      const product = await getProduct(productId)
      return !!product?.calculationTemplateId
    } catch (err) {
      console.error('Error checking product template:', err)
      return false
    }
  }, [])

  /**
   * Get calculation template for a product
   */
  const getTemplateForProduct = useCallback(async (productId) => {
    try {
      const product = await getProduct(productId)
      if (!product?.calculationTemplateId) {
        return null
      }
      return await getCalculationTemplate(product.calculationTemplateId)
    } catch (err) {
      console.error('Error getting template:', err)
      return null
    }
  }, [])

  /**
   * Get list options for a product field
   */
  const getListOptionsForField = useCallback(async (productId, listKey) => {
    try {
      const product = await getProduct(productId)
      if (!product) return []

      return await getEffectiveListOptions(tenantId, productId, listKey, product)
    } catch (err) {
      console.error('Error getting list options:', err)
      return []
    }
  }, [tenantId])

  /**
   * Calculate income based on template
   */
  const calculateIncome = useCallback(async (productId, fieldValues) => {
    try {
      setLoading(true)
      setError(null)

      const product = await getProduct(productId)
      if (!product?.calculationTemplateId) {
        throw new Error('Product does not use template system')
      }

      const result = await calculateTotal(product.calculationTemplateId, fieldValues, product)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Calculate costs based on template
   */
  const calculateProductCosts = useCallback(async (productId, costValues, totalIncome) => {
    try {
      setLoading(true)
      setError(null)

      const product = await getProduct(productId)
      if (!product?.calculationTemplateId) {
        throw new Error('Product does not use template system')
      }

      const result = await calculateCosts(product.calculationTemplateId, costValues, totalIncome)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Calculate full breakdown (income, costs, GP)
   */
  const calculateFullBreakdown = useCallback(async (productId, fieldValues, costValues) => {
    try {
      setLoading(true)
      setError(null)

      const product = await getProduct(productId)
      if (!product?.calculationTemplateId) {
        throw new Error('Product does not use template system')
      }

      // Calculate income
      const incomeResult = await calculateTotal(product.calculationTemplateId, fieldValues, product)

      // Calculate costs
      const costsResult = await calculateCosts(product.calculationTemplateId, costValues, incomeResult.total)

      // Calculate GP
      const gpResult = calculateGrossProfit(incomeResult.total, costsResult.totalCost)

      return {
        income: incomeResult.total,
        costs: costsResult.totalCost,
        grossProfit: gpResult.grossProfit,
        gpPercentage: gpResult.gpPercentage,
        incomeBreakdown: incomeResult.breakdown,
        costBreakdown: costsResult.costs
      }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Calculate monthly distribution
   */
  const calculateMonthly = useCallback(async (productId, fieldValues, fyInfo) => {
    try {
      setLoading(true)
      setError(null)

      const product = await getProduct(productId)
      if (!product?.calculationTemplateId) {
        throw new Error('Product does not use template system')
      }

      // First calculate total
      const incomeResult = await calculateTotal(product.calculationTemplateId, fieldValues, product)

      // Then distribute monthly
      const distribution = await calculateMonthlyDistribution(
        product.calculationTemplateId,
        { ...fieldValues, totalAmount: incomeResult.total },
        fyInfo
      )

      return distribution
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    usesTemplateSystem,
    getTemplateForProduct,
    getListOptionsForField,
    calculateIncome,
    calculateProductCosts,
    calculateFullBreakdown,
    calculateMonthly
  }
}

export default useProductCalculation
