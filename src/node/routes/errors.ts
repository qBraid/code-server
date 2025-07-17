import { logger } from "@coder/logger"
import express from "express"
import { promises as fs } from "fs"
import path from "path"
import { HttpCode } from "../../common/http"
import { rootPath } from "../constants"
import { replaceTemplates } from "../http"
import { escapeHtml, getMediaMime } from "../util"
import type { WebsocketRequest } from "../wsRouter"

interface BrandingConfig {
  companyName: string
  productName: string
  companyDomain: string
  logoSvg: string
  faviconSvg: string
  faviconIco: string
  pwaIcon192: string
  pwaIcon512: string
}

function getBrandingConfig(): BrandingConfig {
  let branding: BrandingConfig = {
    companyName: "qBraid",
    productName: "qBraid-Code",
    companyDomain: "qbraid.com",
    logoSvg: "",
    faviconSvg: "",
    faviconIco: "",
    pwaIcon192: "",
    pwaIcon512: "",
  }
  
  try {
    branding = require(path.join(rootPath, "branding.json"))
  } catch (error: any) {
    logger.warn(`Failed to load branding configuration: ${error.message}`)
  }
  
  return branding
}

interface ErrorWithStatusCode {
  statusCode: number
}

interface ErrorWithCode {
  code: string
}

/** Error is network related. */
export const errorHasStatusCode = (error: any): error is ErrorWithStatusCode => {
  return error && "statusCode" in error
}

/** Error originates from file system. */
export const errorHasCode = (error: any): error is ErrorWithCode => {
  return error && "code" in error
}

const notFoundCodes = [404, "ENOENT", "EISDIR"]

export const errorHandler: express.ErrorRequestHandler = async (err, req, res, next) => {
  let statusCode = 500

  if (errorHasStatusCode(err)) {
    statusCode = err.statusCode
  } else if (errorHasCode(err) && notFoundCodes.includes(err.code)) {
    statusCode = HttpCode.NotFound
  }

  res.status(statusCode)

  // Assume anything that explicitly accepts text/html is a user browsing a
  // page (as opposed to an xhr request). Don't use `req.accepts()` since
  // *every* request that I've seen (in Firefox and Chromium at least)
  // includes `*/*` making it always truthy. Even for css/javascript.
  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    const resourcePath = path.resolve(rootPath, "src/browser/pages/error.html")
    res.set("Content-Type", getMediaMime(resourcePath))
    const content = await fs.readFile(resourcePath, "utf8")
    const branding = getBrandingConfig()
    res.send(
      replaceTemplates(req, content)
        .replace(/{{ERROR_TITLE}}/g, statusCode.toString())
        .replace(/{{ERROR_HEADER}}/g, statusCode.toString())
        .replace(/{{ERROR_BODY}}/g, escapeHtml(err.message))
        .replace(/{{PRODUCT_NAME}}/g, branding.productName)
        .replace(/{{PWA_ICON_192}}/g, branding.pwaIcon192)
        .replace(/{{PWA_ICON_512}}/g, branding.pwaIcon512),
    )
  } else {
    res.json({
      error: err.message,
      ...(err.details || {}),
    })
  }
}

export const wsErrorHandler: express.ErrorRequestHandler = async (err, req, res, next) => {
  let statusCode = 500
  if (errorHasStatusCode(err)) {
    statusCode = err.statusCode
  } else if (errorHasCode(err) && notFoundCodes.includes(err.code)) {
    statusCode = HttpCode.NotFound
  }
  if (statusCode >= 500) {
    logger.error(`${err.message} ${err.stack}`)
  } else {
    logger.debug(`${err.message} ${err.stack}`)
  }
  ;(req as WebsocketRequest).ws.end(`HTTP/1.1 ${statusCode} ${err.message}\r\n\r\n`)
}
