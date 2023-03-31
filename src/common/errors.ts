import { ValidationError } from '@markdoc/markdoc'
import { ErrorType } from './types'

export function getErrorType(error: ValidationError): ErrorType {
  if (!error.message) {
    return ErrorType.unknown_error
  }
  if (error.message.startsWith('Expected "(" or "="')) {
    return ErrorType.attribute_or_fn_missing
  } else if (error.message.startsWith('Expected "="')) {
    return ErrorType.attribute_missing
  } else if (
    error.message.startsWith(
      'Expected "[", "{", boolean, identifier, null, number, string, or variable'
    )
  ) {
    return ErrorType.value_missing
  } else if (
    error.message.startsWith(
      'Expected "/", class, id, identifier, tag name, or variable'
    )
  ) {
    return ErrorType.tag_missing
  } else {
    return ErrorType.unknown_error
  }
}
