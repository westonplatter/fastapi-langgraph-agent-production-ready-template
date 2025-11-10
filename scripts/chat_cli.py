#!/usr/bin/env python3
"""Interactive CLI for chatting with the LangGraph FastAPI agent.

This CLI allows you to authenticate and have conversations with the API.
It stores credentials and session tokens for convenience.
"""

import json
import os
import sys
from pathlib import Path
from typing import (
    Optional,
    Tuple,
)

import colorama
from colorama import (
    Fore,
    Style,
)

try:
    import httpx
except ImportError:
    print("Error: httpx is required. Install it with: pip install httpx")
    sys.exit(1)

# Initialize colorama
colorama.init()

# Default API base URL
DEFAULT_API_URL = "http://localhost:8000"
CONFIG_FILE = Path.home() / ".langgraph_chat_cli.json"


class ChatCLI:
    """Interactive CLI for chatting with the API."""

    def __init__(self, api_url: str = DEFAULT_API_URL):
        """Initialize the CLI client.

        Args:
            api_url: Base URL of the API
        """
        self.api_url = api_url.rstrip("/")
        self.user_token: Optional[str] = None
        self.session_token: Optional[str] = None
        self.session_id: Optional[str] = None
        self.email: Optional[str] = None
        self.load_config()

    def load_config(self) -> None:
        """Load saved configuration from file."""
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, "r") as f:
                    config = json.load(f)
                    self.user_token = config.get("user_token")
                    self.session_token = config.get("session_token")
                    self.session_id = config.get("session_id")
                    self.email = config.get("email")
            except Exception as e:
                print(f"{Fore.YELLOW}Warning: Could not load config: {e}{Style.RESET_ALL}")

    def save_config(self) -> None:
        """Save configuration to file."""
        config = {
            "user_token": self.user_token,
            "session_token": self.session_token,
            "session_id": self.session_id,
            "email": self.email,
        }
        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"{Fore.YELLOW}Warning: Could not save config: {e}{Style.RESET_ALL}")

    def print_header(self) -> None:
        """Print CLI header."""
        print("\n" + "=" * 60)
        print(f"{Fore.CYAN}{Style.BRIGHT}LangGraph Chat CLI{Style.RESET_ALL}".center(60))
        print("=" * 60 + "\n")

    def print_success(self, message: str) -> None:
        """Print success message."""
        print(f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}")

    def print_error(self, message: str) -> None:
        """Print error message."""
        print(f"{Fore.RED}✗ {message}{Style.RESET_ALL}")

    def print_info(self, message: str) -> None:
        """Print info message."""
        print(f"{Fore.BLUE}ℹ {message}{Style.RESET_ALL}")

    def register(self, email: str, password: str) -> bool:
        """Register a new user.

        Args:
            email: User email
            password: User password

        Returns:
            True if registration successful, False otherwise
        """
        try:
            response = httpx.post(
                f"{self.api_url}/api/v1/auth/register",
                json={"email": email, "password": password},
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
            self.user_token = data["token"]["access_token"]
            self.email = email
            self.save_config()
            self.print_success(f"Registered successfully as {email}")
            return True
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 400:
                self.print_error("Email already registered. Try logging in instead.")
            else:
                self.print_error(f"Registration failed: {e.response.text}")
            return False
        except Exception as e:
            self.print_error(f"Registration failed: {str(e)}")
            return False

    def login(self, email: str, password: str) -> bool:
        """Login with email and password.

        Args:
            email: User email
            password: User password

        Returns:
            True if login successful, False otherwise
        """
        try:
            response = httpx.post(
                f"{self.api_url}/api/v1/auth/login",
                data={"username": email, "password": password, "grant_type": "password"},
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
            self.user_token = data["access_token"]
            self.email = email
            self.save_config()
            self.print_success(f"Logged in successfully as {email}")
            return True
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                self.print_error("Invalid email or password")
            else:
                self.print_error(f"Login failed: {e.response.text}")
            return False
        except Exception as e:
            self.print_error(f"Login failed: {str(e)}")
            return False

    def create_session(self) -> bool:
        """Create a new chat session.

        Returns:
            True if session created successfully, False otherwise
        """
        if not self.user_token:
            self.print_error("Not authenticated. Please login or register first.")
            return False

        try:
            response = httpx.post(
                f"{self.api_url}/api/v1/auth/session",
                headers={"Authorization": f"Bearer {self.user_token}"},
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()
            self.session_token = data["token"]["access_token"]
            self.session_id = data["session_id"]
            self.save_config()
            self.print_success(f"Session created: {self.session_id[:8]}...")
            return True
        except Exception as e:
            self.print_error(f"Failed to create session: {str(e)}")
            return False

    def chat(self, message: str) -> Optional[str]:
        """Send a chat message and get response.

        Args:
            message: User message

        Returns:
            Assistant response or None if error
        """
        if not self.session_token:
            self.print_error("No active session. Creating one...")
            if not self.create_session():
                return None

        try:
            # Get current conversation history
            history_response = httpx.get(
                f"{self.api_url}/api/v1/chatbot/messages",
                headers={"Authorization": f"Bearer {self.session_token}"},
                timeout=30.0,
            )

            messages = []
            if history_response.status_code == 200:
                history_data = history_response.json()
                messages = history_data.get("messages", [])

            # Add new user message
            messages.append({"role": "user", "content": message})

            # Send chat request
            response = httpx.post(
                f"{self.api_url}/api/v1/chatbot/chat",
                headers={"Authorization": f"Bearer {self.session_token}"},
                json={"messages": messages},
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

            # Extract assistant's last message
            assistant_messages = [msg for msg in data["messages"] if msg["role"] == "assistant"]
            if assistant_messages:
                return assistant_messages[-1]["content"]
            return None
        except httpx.HTTPStatusError as e:
            self.print_error(f"Chat request failed: {e.response.text}")
            return None
        except Exception as e:
            self.print_error(f"Chat request failed: {str(e)}")
            return None

    def authenticate(self) -> bool:
        """Handle authentication flow.

        Returns:
            True if authenticated successfully, False otherwise
        """
        if self.user_token:
            self.print_info(f"Using saved credentials for {self.email}")
            return True

        # Default credentials to suggest
        default_email = "test@example.com"
        default_password = "Test123!@#"

        print(f"\n{Fore.CYAN}Login Required{Style.RESET_ALL}")
        email = input(f"{Fore.BLUE}Email [{default_email}]: {Style.RESET_ALL}").strip() or default_email
        password = input(f"{Fore.BLUE}Password [{default_password}]: {Style.RESET_ALL}").strip() or default_password

        return self.login(email, password)

    def run(self) -> None:
        """Run the interactive chat CLI."""
        self.print_header()

        # Authenticate
        if not self.authenticate():
            self.print_error("Authentication failed. Exiting.")
            return

        # Create session if needed
        if not self.session_token:
            if not self.create_session():
                self.print_error("Failed to create session. Exiting.")
                return

        self.print_success("Ready to chat! Type 'quit' or 'exit' to end, 'clear' to clear history")
        print()

        conversation_history = []

        while True:
            try:
                # Get user input
                user_input = input(f"{Fore.GREEN}You: {Style.RESET_ALL}").strip()

                if not user_input:
                    continue

                if user_input.lower() in ("quit", "exit", "q"):
                    print(f"\n{Fore.CYAN}Goodbye!{Style.RESET_ALL}\n")
                    break

                if user_input.lower() == "clear":
                    try:
                        httpx.delete(
                            f"{self.api_url}/api/v1/chatbot/messages",
                            headers={"Authorization": f"Bearer {self.session_token}"},
                            timeout=10.0,
                        )
                        conversation_history = []
                        self.print_success("Chat history cleared")
                        continue
                    except Exception as e:
                        self.print_error(f"Failed to clear history: {str(e)}")
                        continue

                # Send message and get response
                print(f"{Fore.YELLOW}Thinking...{Style.RESET_ALL}")
                response = self.chat(user_input)

                if response:
                    print(f"{Fore.CYAN}Assistant: {Style.RESET_ALL}{response}\n")
                    conversation_history.append({"role": "user", "content": user_input})
                    conversation_history.append({"role": "assistant", "content": response})
                else:
                    self.print_error("Failed to get response")

            except KeyboardInterrupt:
                print(f"\n\n{Fore.CYAN}Goodbye!{Style.RESET_ALL}\n")
                break
            except Exception as e:
                self.print_error(f"Error: {str(e)}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Interactive CLI for LangGraph Chat API")
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help=f"API base URL (default: {DEFAULT_API_URL})",
    )
    parser.add_argument(
        "--email",
        help="Email for quick login (will prompt for password)",
    )
    parser.add_argument(
        "--password",
        help="Password for quick login (use with --email)",
    )

    args = parser.parse_args()

    cli = ChatCLI(api_url=args.api_url)

    # Quick login if credentials provided
    if args.email and args.password:
        if not cli.login(args.email, args.password):
            sys.exit(1)
        if not cli.create_session():
            sys.exit(1)

    cli.run()


if __name__ == "__main__":
    main()

