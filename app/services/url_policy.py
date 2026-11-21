import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit

import httpx

from app.errors import AnalysisError


def normalize_url(value: str) -> str:
    try:
        parsed = urlsplit(value.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError
        if parsed.username is not None or parsed.password is not None:
            raise ValueError
        if parsed.port not in {None, 80, 443}:
            raise ValueError
        if "\\" in value or any(ord(char) < 32 for char in value):
            raise ValueError
        hostname = parsed.hostname.encode("idna").decode("ascii").lower().rstrip(".")
        if (
            "%" in hostname
            or hostname == "localhost"
            or hostname.endswith((".localhost", ".local", ".internal", ".test", ".invalid"))
        ):
            raise ValueError
        host = f"[{hostname}]" if ":" in hostname else hostname
        default_port = 443 if parsed.scheme == "https" else 80
        if parsed.port is not None and parsed.port != default_port:
            raise ValueError
        normalized = urlunsplit((parsed.scheme, host, parsed.path or "/", parsed.query, ""))
        return str(httpx.URL(normalized))
    except (ValueError, UnicodeError, httpx.InvalidURL) as exc:
        raise AnalysisError(
            "invalid_url", "Enter a public HTTP or HTTPS URL without credentials or custom ports."
        ) from exc


def is_public_ip(value: str) -> bool:
    address = ipaddress.ip_address(value)
    if isinstance(address, ipaddress.IPv6Address):
        # Reject transition mechanisms as well as IPv4-mapped addresses.
        if address.ipv4_mapped or address.sixtofour or address.teredo:
            return False
        if address in ipaddress.ip_network("64:ff9b::/96"):
            return False
    return address.is_global and not address.is_multicast


async def resolve_public_ip(hostname: str, port: int) -> str:
    try:
        answers = await asyncio.get_running_loop().getaddrinfo(
            hostname, port, type=socket.SOCK_STREAM
        )
        addresses = list(dict.fromkeys(item[4][0] for item in answers))
    except (OSError, UnicodeError) as exc:
        raise AnalysisError("dns_failed", "The website hostname could not be resolved.") from exc
    if not addresses or not all(is_public_ip(address) for address in addresses):
        raise AnalysisError(
            "blocked_address", "Private and non-public network addresses are blocked."
        )
    # Pin a single validated address; no second hostname resolution can rebind it.
    return sorted(addresses, key=lambda address: ":" in address)[0]
