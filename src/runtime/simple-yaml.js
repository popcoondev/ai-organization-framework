function countIndent(line) {
  let count = 0;
  while (count < line.length && line[count] === " ") {
    count += 1;
  }
  return count;
}

function normalizeLines(text) {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trimStart().startsWith("#"));
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "[]") {
    return [];
  }
  if (trimmed === "{}") {
    return {};
  }
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (trimmed === "null") {
    return null;
  }
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed;
}

function parseObjectEntry(content) {
  const separatorIndex = content.indexOf(":");
  if (separatorIndex < 0) {
    throw new Error(`Invalid YAML mapping entry: ${content}`);
  }
  const key = content.slice(0, separatorIndex).trim();
  const rawValue = content.slice(separatorIndex + 1).trim();
  return { key, rawValue };
}

function parseBlock(lines, startIndex, indent) {
  if (startIndex >= lines.length) {
    return { value: null, nextIndex: startIndex };
  }

  const firstLine = lines[startIndex];
  const firstIndent = countIndent(firstLine);
  if (firstIndent < indent) {
    return { value: null, nextIndex: startIndex };
  }

  const isArray = firstLine.slice(firstIndent).startsWith("- ");
  return isArray
    ? parseArray(lines, startIndex, indent)
    : parseObject(lines, startIndex, indent);
}

function parseArray(lines, startIndex, indent) {
  const items = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const lineIndent = countIndent(line);
    if (lineIndent < indent) {
      break;
    }
    if (lineIndent > indent) {
      throw new Error(`Unexpected nested indentation in YAML array at line: ${line}`);
    }

    const content = line.slice(indent);
    if (!content.startsWith("- ")) {
      break;
    }

    const itemValue = content.slice(2).trim();
    if (itemValue === "") {
      const nestedStart = index + 1;
      const nestedIndent = nestedStart < lines.length ? countIndent(lines[nestedStart]) : indent + 2;
      const nested = parseBlock(lines, nestedStart, nestedIndent);
      items.push(nested.value);
      index = nested.nextIndex;
      continue;
    }

    items.push(parseScalar(itemValue));
    index += 1;
  }

  return { value: items, nextIndex: index };
}

function parseObject(lines, startIndex, indent) {
  const object = {};
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const lineIndent = countIndent(line);
    if (lineIndent < indent) {
      break;
    }
    if (lineIndent > indent) {
      throw new Error(`Unexpected nested indentation in YAML object at line: ${line}`);
    }

    const content = line.slice(indent);
    const { key, rawValue } = parseObjectEntry(content);

    if (rawValue !== "") {
      object[key] = parseScalar(rawValue);
      index += 1;
      continue;
    }

    const nestedStart = index + 1;
    if (nestedStart >= lines.length || countIndent(lines[nestedStart]) <= indent) {
      object[key] = {};
      index += 1;
      continue;
    }

    const nestedIndent = countIndent(lines[nestedStart]);
    const nested = parseBlock(lines, nestedStart, nestedIndent);
    object[key] = nested.value;
    index = nested.nextIndex;
  }

  return { value: object, nextIndex: index };
}

export function parseSimpleYaml(text) {
  const lines = normalizeLines(text);
  if (lines.length === 0) {
    return {};
  }
  return parseBlock(lines, 0, countIndent(lines[0])).value;
}
