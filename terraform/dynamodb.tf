resource "aws_dynamodb_table" "knowledge_articles" {
  name         = "MacOSUI-KnowledgeArticles"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "pod_id"
    type = "S"
  }

  global_secondary_index {
    name            = "pod_id-index"
    hash_key        = "pod_id"
    projection_type = "ALL"
  }
}
