// middleware/paginate.js
export function paginate(defaultLimit = 10, maxLimit = 1000) {
  return (req, _res, next) => {
    // 1. Safe parsing to integers (fallback to defaults if omitted or non-numeric)
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    // 2. Validate and clamp bounds
    page = (!isNaN(page) && page > 0) ? page : 1;
    limit = (!isNaN(limit) && limit > 0) ? limit : defaultLimit;
    if (limit > maxLimit) limit = maxLimit;

    // 3. Compute database OFFSET / skip value
    const skip = (page - 1) * limit;

    // 4. Attach sanitized numeric properties to req
    req.pagination = {
      page,
      limit,
      skip,
      offset: skip // Alias for preference
    };

    next();
  };
}
