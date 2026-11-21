class AnalysisError(Exception):
    """A safe, public error. Never include upstream bodies or secrets."""

    def __init__(self, code: str, message: str, status_code: int = 422):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)
